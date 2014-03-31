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
            this.dispathChange(changeRecord);
        }
    }.bind(this);
    
    db.on('change', this.dbChangeHandler);
}


define(View, {
    value: function value(callback) {
        var db = this.db;
        db.get(this.path, callback);
    },
    
    
    set: function set(data, callback) {
        this.dispathChange({ type: 'set', path: this.path, data: data });
        this.db.set(this.url, data, callback, this.uid);
    },
    
    'delete': function del(callback) {
        this.dispathChange({ type: 'delete', path: this.path});
        this.db.delete(this.url, callback, this.uid);
    },
    
    push: function push(data, callback) {
        this.dispathChange({ type: 'push', path: this.path, data: data });
        this.db.push(this.url, data, callback, this.uid);
    },
    
    splice: function splice(index, callback) {
        this.dispathChange({ type: 'splice', path: this.path, index: index });
        this.db.splice(this.url, index, callback, this.uid);
    },
    
    bind: bind,
       
    dispathChange: function dispathChange(changeRecord) {
        if (changeRecord.path.indexOf(this.path) === 0 || this.path.indexOf(changeRecord.path) === 0) {
            this.changesListener.forEach(function (listener) {
                listener(changeRecord);
            });
        }
    },
    
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
    }
});

module.exports = View;