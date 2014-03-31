'use strict';

/* global it, describe, beforeEach, afterEach */

var chai            = require('chai'),
    sinon           = require('sinon'), 
    sinonChai       = require('sinon-chai'),
    View            = require('../lib/view'),
    helpers         = require('./helpers');

chai.use(sinonChai);

var expect = chai.expect;

describe('view', function () {
    var jsondb = helpers.jsondb(),
        changeSpy = sinon.spy(),
        view;
    
    beforeEach(function () {
        view = new View(jsondb, '/foo/bar');
    });
    
    
    afterEach(function () {
        view.dispose();
        changeSpy.reset();
        jsondb.removeAllListeners();
    });
    
    it('should proxy over jsondb at the given path', function () {
        
        var mock = sinon.mock(jsondb);
        
        var callback = function () {};
        mock.expects('get').once().calledWith('/foo/bar', callback);
        mock.expects('set').once().calledWith('/foo/bar', {foo: 'bar'}, callback);
        mock.expects('delete').once().calledWith('/foo/bar', callback);
        mock.expects('push').once().calledWith('/foo/bar', 'world', callback);
        mock.expects('splice').once().calledWith('/foo/bar', 3, callback);
        
        
        view.value(callback);
        view.set({foo: 'bar'}, callback);
        view.delete(callback);
        view.push('world', callback);
        view.splice(3, callback);
        
        
        mock.verify();
        mock.restore();
    });
    
    
    it('should listen to database change and redispatch them', function () {
        view.addChangeListener(changeSpy);
        jsondb.emit('change', { type: 'set', path: '/foo/bar', data: 'hello world'});
        jsondb.emit('change', { type: 'delete', path: '/foo/bar'});
        expect(changeSpy).to.have.callCount(2);
        expect(changeSpy).to.have.been.calledWith({ type: 'set', path: '/foo/bar', data: 'hello world'});
        expect(changeSpy).to.have.been.calledWith({ type: 'delete', path: '/foo/bar'});
    });
    
    it('should listen to database change and redispatch them', function () {
        view.addChangeListener(changeSpy);
        jsondb.emit('change', { type: 'set', path: '/foo/bar', data: 'hello world'});
        jsondb.emit('change', { type: 'delete', path: '/foo/bar'});
        expect(changeSpy).to.have.callCount(2);
        expect(changeSpy).to.have.been.calledWith({ type: 'set', path: '/foo/bar', data: 'hello world'});
        expect(changeSpy).to.have.been.calledWith({ type: 'delete', path: '/foo/bar'});
    });
    
    it('should catch database change that has occured upstream and downstream', function () {
        view.addChangeListener(changeSpy);
        jsondb.emit('change', { type: 'set', path: '/foo', data: 'hello world'});
        jsondb.emit('change', { type: 'delete', path: '/foo/bar/world'});
        expect(changeSpy).to.have.callCount(2);
        expect(changeSpy).to.have.been.calledWith({ type: 'set', path: '/foo', data: 'hello world'});
        expect(changeSpy).to.have.been.calledWith({ type: 'delete', path: '/foo/bar/world'});
    });
    
    
    it('should not catch change that occured in a different path', function () {
        view.addChangeListener(changeSpy);
        jsondb.emit('change', { type: 'set', path: '/foo/world', data: 'hello world'});
        jsondb.emit('change', { type: 'delete', path: '/world'});
        expect(changeSpy).to.have.callCount(0);
    });
    
    it('should not catch change after that the listener has been removed', function () {
        view.addChangeListener(changeSpy);
        view.removeChangeListener(changeSpy);
        jsondb.emit('change', { type: 'set', path: '/foo/world', data: 'hello world'});
        jsondb.emit('change', { type: 'delete', path: '/world'});
        expect(changeSpy).to.have.callCount(0);
    });
    
    it('should not catch change after that all listeners has been removed', function () {
        view.addChangeListener(changeSpy);
        view.removeAllChangeListeners();
        jsondb.emit('change', { type: 'set', path: '/foo/world', data: 'hello world'});
        jsondb.emit('change', { type: 'delete', path: '/world'});
        expect(changeSpy).to.have.callCount(0);
    });
    
    
    it('should not catch change after that all listeners has been removed', function () {
        view.addChangeListener(changeSpy);
        view.removeAllChangeListeners();
        jsondb.emit('change', { type: 'set', path: '/foo/world', data: 'hello world'});
        jsondb.emit('change', { type: 'delete', path: '/world'});
        expect(changeSpy).to.have.callCount(0);
    });
    
    it('should dispatch directly change that has been set on the view,', function () {
        view.addChangeListener(changeSpy);
        var callback = function () {};
        view.set({foo: 'bar'}, callback);
        view.delete(callback);
        view.push('world', callback);
        view.splice(3, callback);
        expect(changeSpy).to.have.callCount(4);
        expect(changeSpy).to.have.been.calledWith({ type: 'set', path: '/foo/bar', data: {foo: 'bar'}});
        expect(changeSpy).to.have.been.calledWith({ type: 'delete', path: '/foo/bar'});
        expect(changeSpy).to.have.been.calledWith({ type: 'push', path: '/foo/bar', data: 'world'});
        expect(changeSpy).to.have.been.calledWith({ type: 'splice', path: '/foo/bar', index: 3});
    });
    
    
    it('should not dispatch  change that originate from the view', function () {
        view.addChangeListener(changeSpy);
        jsondb.emit('change', { type: 'set', path: '/foo/bar', data: 'hello world', uid: view.uid});
        jsondb.emit('change', { type: 'delete', path: '/foo/bar'});
        expect(changeSpy).to.have.callCount(1);
        expect(changeSpy).to.have.been.calledWith({ type: 'delete', path: '/foo/bar'});
    });
    
});

