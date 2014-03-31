'use strict';


module.exports = function (io, db, dispose) {
    var sockets = [];
    
    function changeHandler() {
        var args = ['change'].concat(Array.prototype.slice.call(arguments));
        sockets.forEach(function (socket) {
            socket.emit.apply(socket, args);
        });
    }
    
    db.on('change', changeHandler);
    
    io.on('connection', function (socket) {
        sockets.push(socket);
        
        socket.on('get', function (path, callback) {
            db.get(path, callback);
        });
        
        socket.on('set', function (path, data, callback) {
            db.set(path, data, callback, socket.__uid);
        });
        
        socket.on('push', function (path, data, callback) {
            db.push(path, data, callback, socket.__uid);
        });
        
        socket.on('splice', function (path, index, callback) {
            db.splice(path, index,callback, socket.__uid);
        });
        
        socket.on('delete', function (path, callback) {
            db.delete(path, callback, socket.__uid);
        });
        
        
        socket.on('disconnect', function () { 
            var index = sockets.indexOf(socket); 
            if (index !== -1) {
                sockets.splice(index, 1);
            }
            socket.removeAllListeners();
        });
    });
    
    return {
        dispose: function () {
            dispose();
            db.removeListener('change', changeHandler);
            sockets.forEach(function (socket) {
                socket.removeAllListeners();
            });
            sockets = null;
            io = null;
        }
    };
};