'use strict';

/* global it, describe, beforeEach, afterEach */

var chai            = require('chai'),
    sinon           = require('sinon'), 
    sinonChai       = require('sinon-chai'),
    View            = require('../lib/view'),
    helpers         = require('./helpers');

chai.use(sinonChai);

var expect = chai.expect;

describe('bind', function () {
    var jsondb = helpers.jsondb(),
        spy = sinon.spy(),
        view, value, err;
    
    jsondb.get = function(path, callback) {
        callback(err, value);
    };
    
    beforeEach(function () {
        view = new View(jsondb, '/foo/bar');
    });
    
    afterEach(function () {
        value = err = undefined;
        view.dispose();
        spy.reset();
        jsondb.removeAllListeners();
    });
    
    it('should retrieve the value at the view node', function () {
        value = {foo : 'barr'};
        view.bind(spy);
        expect(spy).to.have.callCount(1);
        expect(spy).to.have.been.calledWith(null, {foo : 'barr'});
    });
    
    
    it('it should call the callback with the new value when the value is set at the given node', function () {
        value = {foo : 'barr'};
        view.bind(spy);
        view.set({hello: 'world'});
        expect(spy).to.have.callCount(2);
        expect(spy).to.have.been.calledWith(null, {foo : 'barr'});
        expect(spy).to.have.been.calledWith(null, {hello : 'world'});
    });
    
    
    it('it should call the callback with an array containing the pushed data, when push occurs at the view node', function () {
        value = [1];
        view.bind(spy);
        view.push(2);
        expect(spy).to.have.callCount(2);
        expect(spy).to.have.been.calledWith(null, [1]);
        expect(spy).to.have.been.calledWith(null, [1, 2]);
    });
    
    
    it('it should call the callback with an array without the spliced index, when push occurs at the view node', function () {
        value = [1, 2, 3];
        view.bind(spy);
        view.splice(1);
        expect(spy).to.have.callCount(2);
        expect(spy).to.have.been.calledWith(null, [1, 2, 3]);
        expect(spy).to.have.been.calledWith(null, [1, 3]);
    });
    
    it('it should call the callback with the error when the jsondb returns an error, and remove all change listener', function () {
        err = new Error();
        view.bind(spy);
        view.set({hello: 'world'});
        expect(spy).to.have.callCount(1);
        expect(spy).to.have.been.calledWith(err);
    });
    
    
    
    it('it should call the callback with merged properties when value is set downstream', function () {
        value = {prop : { obj: { foo: 'bar' }}};
        view.bind(spy);
        jsondb.emit('change', { type: 'set', data: {} , path: '/foo/bar/prop' });
        jsondb.emit('change', { type: 'set', data: 'world' , path: '/foo/bar/prop/geet/hello' });
        expect(spy).to.have.callCount(3);
        expect(spy).to.have.been.calledWith(null, value);
        expect(spy).to.have.been.calledWith(null,  {prop : {}});
        expect(spy).to.have.been.calledWith(null,  {prop : { geet: { hello: 'world' }}});
    });
    
    it('it should call the callback with merged properties when value is deleted downstream', function () {
        value = {prop : { obj: { foo: 'bar' }}};
        view.bind(spy);
        jsondb.emit('change', { type: 'delete', data: {} , path: '/foo/bar/prop/obj' });
        expect(spy).to.have.callCount(2);
        expect(spy).to.have.been.calledWith(null, value);
        expect(spy).to.have.been.calledWith(null,  {prop : {}});
    });
    
    
    it('it should call the callback with array updated when value is pushed downstream', function () {
        value = {prop : { array: [1, 2, 3]}};
        view.bind(spy);
        jsondb.emit('change', { type: 'push', data: { arr : [1, 2, 3]} , path: '/foo/bar/prop/array' });
        jsondb.emit('change', { type: 'push', data: 4 , path: '/foo/bar/prop/array/3/arr' });
        jsondb.emit('change', { type: 'push', data: 1 , path: '/foo/bar/hello/foo' });
        expect(spy).to.have.callCount(4);
        expect(spy).to.have.been.calledWith(null, value);
        expect(spy).to.have.been.calledWith(null,  { prop : { array: [1, 2, 3, { arr : [1, 2, 3] }] } });
        expect(spy).to.have.been.calledWith(null,  { prop : { array: [1, 2, 3, { arr : [1, 2, 3, 4] }] } });
        expect(spy).to.have.been.calledWith(null,  { hello: { foo: [1] }, prop : { array: [1, 2, 3, { arr : [1, 2, 3, 4] }] } });
    });
    
    it('should call the callback with array updated when is spliced downstram', function () {
        value = {prop: { array: [1, 2, 3]}};
        view.bind(spy);
        jsondb.emit('change', { type: 'splice', index: 1 , path: '/foo/bar/prop/array' });
        expect(spy).to.have.callCount(2);
        expect(spy).to.have.been.calledWith(null, value);
        expect(spy).to.have.been.calledWith(null, {prop: { array: [1, 3]}});
    });
    
    it('it should call the callback with the new value when the value is set upstream', function () {
        value = {prop : { obj: { foo: 'bar' }}};
        view.bind(spy);
        jsondb.emit('change', { type: 'set', data: { bar: 'hello'} , path: '/foo' });
        jsondb.emit('change', { type: 'set', data: {} , path: '/' });
        expect(spy).to.have.callCount(3);
        expect(spy).to.have.been.calledWith(null, value);
        expect(spy).to.have.been.calledWith(null, 'hello');
        expect(spy).to.have.been.calledWith(null,  undefined);
    });
    
    it('it should call the callback with the undefiend when the value is deleted upstream', function () {
        value = {prop : { obj: { foo: 'bar' }}};
        view.bind(spy);
        jsondb.emit('change', { type: 'delete', path: '/foo' });
        expect(spy).to.have.callCount(2);
        expect(spy).to.have.been.calledWith(null, value);
        expect(spy).to.have.been.calledWith(null,  undefined);
    });
    
    
    it('it should try to retrieve the new value if the current index has been spliced upstream', function () {
        view.path = '/array/1';
        value = { hello: 'world' };
        view.bind(spy);
        value = { foo: 'bar' };
        jsondb.emit('change', { type: 'splice', index: 1,  path: '/array' });
        expect(spy).to.have.callCount(2);
        expect(spy).to.have.been.calledWith(null, { hello: 'world' });
        expect(spy).to.have.been.calledWith(null,  { foo: 'bar' });
    });
    
});
