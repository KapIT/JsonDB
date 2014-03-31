'use strict';
var utils       = require('./utils'),
    define      = utils.define,
    uuid        = require('uuid'),
    bind        = require('./bind');

function View(db, path) {
    this.path = path;
    this.db = db;
    this.uid = uuid.v4();
    this.changesListener = [];
    
    this.dbChangeHandler = function (changeRecord) {
        if (typeof changeRecord.uid === 'undefined' ||  changeRecord.uid !== this.uid ) {
            this._dispathChange(changeRecord);
        }
    }.bind(this);
    
    db.on('change', this.dbChangeHandler);
}


define(View, {
    get: function subview(path) {
        return new View(this.db, (this.path + '/' + path).replace(/\/\//g, '/').replace(/^\//, ''));
    },
    value: function value(callback) {
        var db = this.db;
        db.get(this.path, callback);
    },
    
    set: function set(data, callback) {
        this._dispathChange({ type: 'set', path: this.path, data: data });
        this.db.set(this.path, data, callback, this.uid);
    },
    
    'delete': function del(callback) {
        this._dispathChange({ type: 'delete', path: this.path});
        this.db.delete(this.path, callback, this.uid);
    },
    
    push: function push(data, callback) {
        this._dispathChange({ type: 'push', path: this.path, data: data });
        this.db.push(this.path, data, callback, this.uid);
    },
    
    splice: function splice(index, callback) {
        this._dispathChange({ type: 'splice', path: this.path, index: index });
        this.db.splice(this.path, index, callback, this.uid);
    },
    
    bind: bind,
       
    
    addChangeListener: function addChangeListener(callback) {
        this.changesListener.push(callback);
    },
    
    removeChangeListener: function removeChangeListener(callback) {
        var index = this.changesListener.indexOf(callback);
        if (index !== -1) {
            this.changesListener.splice(index, 1);
        }
    },
    
    removeAllChangeListeners: function removeAllChangeListeners() {
        this.changesListener = [];
    },
    
    dispose: function dispose() {
        this.db.removeListener('change', this.dbChangeHandler);
        this.changesListener = null;
        this.changesPull = null;
    },
    
    //private
    _dispathChange: function _dispathChange(changeRecord) {
        if (changeRecord.path.indexOf(this.path) === 0 || this.path.indexOf(changeRecord.path) === 0) {
            this.changesListener.forEach(function (listener) {
                listener(changeRecord);
            });
        }
    }
});

module.exports = View;