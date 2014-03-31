'use strict';
var EventEmitter    = require('events').EventEmitter,
    define          = require('./utils').define,
    View            = require('./view');
    


function JsonClient(socket) {
    if (!(this instanceof JsonClient)){
        return new JsonClient(socket);
    }
    var self = this;
    this.socket = socket;
    this.socket.on('connect', function () {
        socket.on('change', function () {
            var args = ['change'].concat(Array.prototype.slice.call(arguments));
            self.emit.apply(self, args);
        });
    });
}

define(JsonClient, EventEmitter, {
    get: function get(url, callback) {
        this.socket.emit('get', url, callback);
    },
    set: function set(url, data, callback, uid) {
        this.socket.emit('set', url, data, uid, callback);
    },
    push: function push(url, data, callback, uid) {
        this.socket.emit('push', url, data, uid, callback);
    },
    splice: function push(url, index, callback, uid) {
        this.socket.emit('splice', url, index, uid, callback);
    },
    'delete': function del(url, callback, uid) {
        this.socket.emit('delete', url, callback, uid, callback);
    },
    dispose: function () {
        this.socket.removeAllListeners();
        this.socket.close();
        this.socket = null;
    },
    
    view: function view(url) {
        return new View(this, url);
    }
});


module.exports = JsonClient;