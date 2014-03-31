'use strict';

var fs              = require('fs'),
    path            = require('path'),
    EventEmitter    = require('events').EventEmitter,
    assign          = require('../lib/utils').assign;
 
exports.rmdir = function rmdir(dir) {
	var list = fs.readdirSync(dir);
	for(var i = 0; i < list.length; i++) {
		var filename = path.join(dir, list[i]);
		var stat = fs.statSync(filename);
		
		if(filename === '.' || filename === '..') {
			// pass these files
		} else if(stat.isDirectory()) {
			// rmdir recursively
			rmdir(filename);
		} else {
			// rm fiilename
			fs.unlinkSync(filename);
		}
	}
	fs.rmdirSync(dir);
};

exports.jsondb = function () {
    return assign(new EventEmitter(),{
        get: function () {},
        set: function () {},
        'delete': function () {},
        push: function () {},
        splice: function () {},
    });
};

