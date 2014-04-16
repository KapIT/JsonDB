'use strict';

/* global it, describe, beforeEach, afterEach */

var chai        = require('chai'),
    levelup     = require('level'),
    sinon       = require('sinon'), 
    sinonChai   = require('sinon-chai'),
    rmdir       = require('./helpers').rmdir,
    JsonDB      = require('../lib/jsondb');

chai.use(sinonChai);

var expect = chai.expect;

describe('JsonDB', function () {
    var db, jsondb;
    
    beforeEach(function () {
        try {
            rmdir('./temp');
        } catch(e) {}
        
        db = levelup('./temp');
        jsondb = new JsonDB(db);
    });
    
    afterEach(function (done) {
        db.close(done);
    });
    
    describe('core', function () {
        function expectRetrieve(descriptors, done, verbose) {
            if (descriptors.length === 0) {
                done();
            } else {
                var descriptor = descriptors.shift(),
                    path = descriptor.path,
                    expected = descriptor.expected;
                jsondb.get(path, function (err, data) {
                    if (err) {
                        throw Error(err);
                    }
                    if (verbose) {
                        console.log(data);
                    }
                    expect(data).to.eql(expected);
                    expectRetrieve(descriptors, done, verbose);
                });
            }

        }
        it('should store object and give the possibility to retrieve them', function (done) {
            jsondb.set('/', { foo: 'bar' }, function (err) {
                if (err) {
                    throw err;
                }
                expectRetrieve([{
                    path: '/',
                    expected: { foo: 'bar'}
                }], done);
            });
        });

        it('should allow to retrieve value of stored object at any level', function (done) {
            jsondb.set('/', { foo: 'bar', subObject: { foo: 'bar', number: 1, boolean: true } }, function (err) {
                if (err) {
                    throw Error(err);
                }
                expectRetrieve([{
                    path: '/foo',
                    expected: 'bar'
                }, {
                    path: '/subObject',
                    expected: { foo: 'bar', number: 1, boolean: true }
                }], done);
            });
        });


        it('arrays should be retrieved as arrays, and we should be able to peek in', function (done) {
            jsondb.set('/', { arr: ['hello', {foo : 'bar'}] }, function (err) {
                if (err) {
                    throw Error(err);
                }
                expectRetrieve([{
                    path: '/',
                    expected: { arr: ['hello', {foo : 'bar'}] }
                }, {
                    path: '/arr',
                    expected: ['hello', {foo : 'bar'}]
                }, {
                    path: '/arr/1',
                    expected: {foo : 'bar'}
                }, {
                    path: '/arr/1/foo',
                    expected: 'bar'
                }], done);
            });
        });

        it('should give the possibility to push data in an array', function (done) {
            jsondb.push('/arr', 'hello' , function (err) {
                if (err) {
                    throw Error(err);
                }
                jsondb.push('/arr', { foo: 'bar'}, function (err) {
                    if (err) {
                        throw Error(err);
                    }
                    expectRetrieve([{
                        path: '/',
                        expected: { arr: ['hello', {foo : 'bar'}] }
                    }, {
                        path: '/arr',
                        expected: ['hello', {foo : 'bar'}]
                    }, {
                        path: '/arr/0',
                        expected: 'hello'
                    }, {
                        path: '/arr/1',
                        expected: {foo : 'bar'}
                    }, {
                        path: '/arr/1/foo',
                        expected: 'bar'
                    }], done);
                });
            });
        });

        it('should give the possibility to splie an index from an array', function (done) {
            jsondb.set('/arr', [0, 1, 2, 3, { foo: 'bar'}, { foo: 'bar'}] , function (err) {
                if (err) {
                    throw Error(err);
                }
                jsondb.splice('/arr', 0, function (err) {
                    if (err) {
                        throw Error(err);
                    }
                    jsondb.splice('/arr', 3, function (err) {
                        if (err) {
                            throw Error(err);
                        }
                        expectRetrieve([{
                            path: '/',
                            expected: { arr: [1, 2, 3, {foo : 'bar'}] }
                        }, {
                            path: '/arr',
                            expected: [1, 2, 3, {foo : 'bar'}]
                        }, {
                            path: '/arr/0',
                            expected: 1
                        }, {
                            path: '/arr/3',
                            expected: {foo : 'bar'}
                        }, {
                            path: '/arr/3/foo',
                            expected: 'bar'
                        }], done);
                    });
                });
            });
        });
    });
    
    
    describe('change dispatching', function () {
        var spy = sinon.spy();
        
        beforeEach(function () {
            jsondb.on('change', spy);
        });
        
        afterEach(function () {
            jsondb.removeListener('change', spy);
            spy.reset();
        });
        
        it('should dispatch change event for set', function (done) {
            jsondb.set('/', { foo: 'bar'}, function () {
                jsondb.set('/hello',  'world' , function () {
                    expect(spy).to.have.callCount(2);
                    expect(spy).to.have.been.calledWith({ type: 'set', path: '/', data: { foo : 'bar'}, uid: undefined });
                    expect(spy).to.have.been.calledWith({ type: 'set', path: '/', data: { foo : 'bar'}, uid: undefined });
                    done();
                });
            });
        });
        
        
        it('should dispatch change event for delete', function (done) {
            jsondb.set('/', { foo: 'bar'}, function () {
                jsondb.delete('/foo', function () {
                    expect(spy).to.have.callCount(2);
                    expect(spy).to.have.been.calledWith({ type: 'set', path: '/', data: { foo : 'bar'}, uid: undefined });
                    expect(spy).to.have.been.calledWith({ type: 'delete', path: '/foo', uid: undefined});
                    done();
                });
            });
        });
        
        
        it('should dispatch change event for push/splice', function (done) {
            jsondb.set('/', [1, 2, 3], function () {
                jsondb.push('/', { foo: 'bar' }, function () {
                    jsondb.splice('/', 1 , function () {
                        expect(spy).to.have.callCount(3);
                        expect(spy).to.have.been.calledWith({ type: 'set', path: '/', data: [1, 2, 3], uid: undefined });
                        expect(spy).to.have.been.calledWith({ type: 'push', path: '/', data: { foo: 'bar' }, uid: undefined});
                        expect(spy).to.have.been.calledWith({ type: 'splice', path: '/', index: 1, uid: undefined });
                        done();
                    });
                });
            });
        });
        
        it('should include in dispatched change the uid given for the change if any', function (done) {
            jsondb.set('/', [1, 2, 3], function () {
                expect(spy).to.have.callCount(1);
                expect(spy).to.have.been.calledWith({ type: 'set', path: '/', data: [1, 2, 3], uid: 'hello'});
                done();
            }, 'hello');
        });
    });
    
    describe('operation queue', function () {
        
        it('should execute operations in a queue', function (done) {
            var spy = sinon.spy(),
                spy2 = sinon.spy(),
                spy3 = sinon.spy();
            
            
            jsondb.set('/', { foo: 'bar'}, spy);
            jsondb.delete('/', spy2);
            jsondb.push('/array', { foo: 'bar'});
            jsondb.push('/array', { gne: 'hello'});
            jsondb.splice('/array', 0);
            
            setTimeout(function () {
                expect(spy).to.have.been.calledBefore(spy2);
                expect(spy2).to.have.been.calledBefore(spy3);
                jsondb.get('/', function (err, data) {
                    expect(data).to.eql({ array: [{ gne: 'hello'}]});
                    done();
                });
            }, 100);
        });
        
        
    });
});