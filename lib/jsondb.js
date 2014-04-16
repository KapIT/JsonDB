'use strict';

var bytewise        = require('bytewise'),
    EventEmitter    = require('events').EventEmitter,
    View            = require('./view'),
    utils           = require('./utils'),
    assign          = utils.assign,
    define          = utils.define,
    retrieveInts    = utils.retrieveInts,
    getParts        = utils.getParts;


// Utils
// =====


//encoding options (force bytewise and JSON)
var encodingOptions = { 
    keyEncoding: {
        encode : bytewise.encode, 
        decode : bytewise.decode, 
        buffer : true,
        type   : 'bytewise' 
    },
    valueEncoding: 'json'
};

//merge set of given options with encoding option
function createOptions(options) {
    return assign({}, options || {}, encodingOptions);
}

// create a readStream with valid encoding options
function createReadStream(db, options) {
    return db.createReadStream(createOptions(options));
}

// create chained batch form that use encoding options
function createBatch(db, options, doneCallback) {
    if (typeof options === 'function') {
        doneCallback = options;
        options = undefined;
    }
    options = createOptions(options);
    var nativeBatch = db.batch();
    return {
        put: function put(key, value) {
            nativeBatch.put(key, value, options);
            return this;
        },
        del: function del(key) {
            nativeBatch.del(key, options);
            return this;
        },
        write: function del(callback) {
            nativeBatch.write(callback);
            doneCallback();
        } 
    };
}

// retrieve a data from the db with correct options
function get(db, key, callback) {
    db.get(key, createOptions(), callback);
}




function deepAssign(target, item) {
    return Object.keys(item).reduce(function (target, key) {
        var value = item[key];
        if (value && typeof value === 'object') {
            target[key] = deepAssign(target[key] || {}, value);
        } else {
            target[key] = value;
        }
        return target;
    }, target);
}

/*function getDataFromPart(target, parts) {
    return parts.reduce(function (target, property) {
        return target[property];
    }, target);
}*/


// Operations
// ==========


function deleteObject(db, parts, batch, callback) {
    createReadStream(db, {
        start: parts.concat(null),
        end: parts.concat(undefined)
    }).on('data', function (data) {
        batch.del(data.key);
    }).on('end', function () {
        callback(null);
    }).on('error', function (err) {
        callback(err);
    });
}


function saveObject(parts, batch, data) {
    if (Array.isArray(data)) {
        data = assign({  __arrayLength__: data.length }, data);
    }
    
    if (data !== null && typeof data === 'object') {
        Object.keys(data).forEach(function (key) {
            saveObject(parts.concat(key), batch, data[key]);
        });
    } else {
        batch.put(retrieveInts(parts), data);
    }
}

function arrayPush(db, parts, batch, data, callback) {
    get(db, parts.concat('__arrayLength__'), function (err, length) {
        if (err) {
            if (err.name === 'NotFoundError') {
                length = 0;
            }
            else {
                callback(err);
                return;
            }
        } 
        batch.put(parts.concat('__arrayLength__'), length + 1);
        saveObject(parts.concat(length), batch, data);
        callback(null);
    });
}

function arraySplice(db, parts, batch, index, callback) {
    get(db, parts.concat('__arrayLength__'), function (err, length) {
        if (err) {
            callback(err); 
        }
        if (index >= length) {
            callback(Error('index out of range'));
        }
        batch.put(parts.concat('__arrayLength__'), length - 1);
        
        var partsLength = parts.length;
        
        createReadStream(db, {
            start: parts.concat(null),
            end: parts.concat(undefined)
        }).on('data', function (data) {
            if (data.key[partsLength] >= index ) {
                batch.del(data.key);
                if(data.key[partsLength] > index) {
                    data.key[partsLength] = data.key[partsLength] - 1;
                    batch.put(data.key, data.value);
                }
            }
        }).on('end', function () {
            callback(null);
        }).on('error', function (err) {
            callback(err);
        });
    });
}

function retrieveObject(db, parts, callback) {
    get(db, parts, function (err, data) {
        if (!err) {
            callback(null, data);
        } else if (err && err.name === 'NotFoundError') {
            var objectParts = [];
            createReadStream(db, {
                start: parts.concat(null),
                end: parts.concat(undefined)
            }).on('data', function (data) {
                objectParts.push(data);
            }).on('end', function () {
                if (objectParts.length === 0) {
                    callback(null, undefined);
                } else {
                    callback(null, objectParts.reduce(function (object, part) {
                        var value = part.value,
                            propertyChain = retrieveInts(part.key.slice(parts.length));
                        
                        return deepAssign(propertyChain.reduceRight(function (value, property) {
                            if(property === '__arrayLength__' && typeof value === 'number') {
                                return new Array(value);
                            }
                            var result = {};
                            result[property] = value;
                            return result;
                        }, value), object);
                    }, {}));
                }
            });
        } else {
            callback(err);
        }
    });
}


/**
 * main class of database instance
 */
function JsonDB(db) {
    if (!(this instanceof JsonDB)){
        return new JsonDB(db);
    }
    this.db = db;
    this.queue = [];
    this.currentOperation  = null;
}


function getBatch(jsondb) {
    if (!jsondb.batch) {
        jsondb.batch = createBatch(jsondb.db, function () {
            jsondb.batch = null;
        });
    }
    return jsondb.batch;
}

function dequeue(db) {
    if (db.currentOperation) {
        return;
    }
    var item = db.queue.shift();
    if (!item) {
        return;
    }
    
    db.currentOperation = item;
    item.operation.call(db, function () {
        if (item.callback) {
            item.callback.apply(undefined, arguments);
        }
        db.currentOperation = null;
        dequeue(db);
    });
}

function enqueue(db, operation, callback) {
    db.queue.push({
        operation: operation,
        callback: callback
    });
    dequeue(db);
}


define(JsonDB, EventEmitter, {
    get: function get(path, callback) {
        enqueue(this, function (callback) {
            var db = this.db;
            retrieveObject(db, getParts(path), callback);
        }, callback);
    },
    
    set: function (path, data, callback, uid) {
        enqueue(this, function (callback) {
            var batch = getBatch(this),
                parts = getParts(path),
                db = this.db,
                self = this;
            
            deleteObject(db, parts, batch, function (err) {
                if (err) {
                    callback(err);
                }
                saveObject(parts, batch, data);
                batch.write(function (err) {
                    if (err) {
                        callback(err);
                    }
                    self.emit('change',  { type: 'set', path: path, data: data, uid: uid });
                    callback();
                });
            });
        }, callback);
    },
    
    
    'delete': function del(path, callback, uid) {
        enqueue(this, function (callback) {
            var batch = getBatch(this),
                parts = getParts(path),
                self = this;
            deleteObject(self.db, parts, batch, function (err) {
                if (err) {
                    callback(err);
                }
                batch.write(function (err) {
                    if (err) {
                        callback(err);
                    }
                    self.emit('change', { type: 'delete', path: path, uid: uid });
                    callback();
                });
            });
        }, callback);
    },
    
    push: function push(path, data, callback, uid) {
        enqueue(this, function (callback) {
            var batch = getBatch(this),
                parts = getParts(path),
                db = this.db,
                self = this;
            arrayPush(db, parts, batch, data, function (err) {
                if (err) {
                    callback(err);
                }
                batch.write(function (err) {
                    if (err) {
                        callback(err);
                    }
                    self.emit('change',  { type: 'push', path: path, data: data, uid: uid });
                    callback();
                });
            });
        }, callback);
    },
    
    splice: function splice(path, index, callback, uid) {
        enqueue(this, function (callback) {
            var batch = getBatch(this),
                parts = getParts(path),
                db = this.db,
                self = this;
            arraySplice(db, parts, batch, index, function (err) {
                if (err) {
                    callback(err);
                }
                batch.write(function (err) {
                    if (err) {
                        callback(err);
                    }
                    self.emit('change',  { type: 'splice', path: path, index: index, uid: uid });
                    callback();
                });
            });
        }, callback);
        
    },
    
    view: function view(url) {
        return new View(this, url || '');
    }
});






module.exports = JsonDB;

