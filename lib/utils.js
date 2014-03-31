'use strict';

var arrProto = Array.prototype,
    slice = Function.call.bind(arrProto.slice);


exports.slice = slice;

/**
 * assign all properties of some objects to another
 * 
 * assign({hello: world}, { property: value}, { property2: value})  
 *      => {hello: world, property: value, property2: value}
 */
function assign(target, items) {
    items = slice(arguments, 1);
    return items.reduce(function (target, item) {
        return Object.keys(item).reduce(function (target, key) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(item, key));
            return target;
        }, target);
    }, target);
}

exports.assign = assign;


/**
 * allow you to define js class with a nice syntax
 * 
 * 
 * function MyClass() {
 *      // constructor things
 * }
 * 
 * define(MyClass, {
 *      myMethod: function () {
 *          //method stuff
 *      }
 * 
 * })
 * 
 * function MySubClass() {
 *      // constructor things
 * }
 * 
 * define(MySubClass, MyClass, {
 *      myMethod: function () {
 *          //method stuff
 *      }
 * 
 * })
 * 
 */
function define(constructor, _super, spec) {
    if (typeof _super === 'object') {
        spec = _super;
        _super = Object;
    }
    constructor.prototype = assign(Object.create(_super.prototype), spec, {constructor: constructor});
}

exports.define = define;


function parsePart(part) {
    if (/^\d+$/.test(part)) {
        return parseInt(part);
    }
    return part;
}
exports.parsePart = parsePart;

function retrieveInts(parts) {
    return parts.map(function (part) {
        return parsePart(part);
    });
}

exports.retrieveInts = retrieveInts;

function getParts(path) {
    return retrieveInts(path.split('/').filter(function (part) {
        return !!part;
    }));
}

exports.getParts = getParts;

