/*global it, describe, before, beforeEach*/

var assert = require("assert"),
    sinon = require('sinon'),
    _ = require("underscore"),
    Backbone = require("backbone"),
    VirtualCollection;

require('../backbone.virtual-collection-0.0.1');
VirtualCollection = Backbone.VirtualCollection;

describe('Backbone.VirtualCollection', function () {

  describe('buildFilterFromHash', function () {

    it('should build an filter that accepts one correct attribute', function () {
      var filter = VirtualCollection.buildFilterFromHash({foo: 'bar'});
      assert.equal(true, filter(new Backbone.Model({foo: 'bar'})));
    });
    it('should build an filter that rejects one false attribute', function () {
      var filter = VirtualCollection.buildFilterFromHash({foo: 'bar'});
      assert.equal(false, filter(new Backbone.Model({foo: 'car'})));
    });
    it('should build an filter that accepts multiple correct attributes', function () {
      var filter = VirtualCollection.buildFilterFromHash({foo: 'bar', ginger: 'ale'});
      assert.equal(true, filter(new Backbone.Model({foo: 'bar', ginger: 'ale'})));
    });
    it('should build an filter that rejects a missing attribute', function () {
      var filter = VirtualCollection.buildFilterFromHash({foo: 'bar', ginger: 'ale'});
      assert.equal(false, filter(new Backbone.Model({foo: 'bar'})));
    });
  });

  describe('#constructor', function () {

    it("should throw a type error if the filter is not a function or hash object", function () {
      var collection = new Backbone.Collection([{foo: 'bar'}, {foo: 'baz'}]);

      assert.throws(function () {
        var vc = new VirtualCollection(collection);
      }, TypeError);

      assert.throws(function () {
        var vc = new VirtualCollection(collection, [1, 2, 3]);
      }, TypeError);

      assert.throws(function () {
        var vc = new VirtualCollection(collection, 1);
      }, TypeError);

      assert.throws(function () {
        var vc = new VirtualCollection(collection, true);
      }, TypeError);

      assert.throws(function () {
        var vc = new VirtualCollection(collection, null);
      }, TypeError);

    });

    it("should bind 4 listeners to it's collection", function () {
      var vc, calls, collection = new Backbone.Collection([{foo: 'bar'}, {foo: 'baz'}]);
      sinon.spy(collection, 'on');
      vc = new VirtualCollection(collection, {});
      calls = JSON.stringify(_.map(collection.on.args, function (i) {return i[0]; }));
      assert.equal(calls, JSON.stringify([ 'add', 'remove', 'change', 'reset' ]));
    });

    it('should build an index on instanciation', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, foo: 'bar'},
        {id: 2, foo: 'baz'},
        {id: 3, foo: 'bar'}
      ]);
      vc = new VirtualCollection(collection, {foo: 'bar'});
      assert.equal(JSON.stringify(vc.index), '[1,3]');
      assert.equal(vc.length, 2);
    });
  });

  describe('#each', function () {

    it('should iterate over the index in order', function () {
      var vc, result = [], collection = new Backbone.Collection([
        {id: 1, foo: 'bar'},
        {id: 2, foo: 'baz'},
        {id: 3, foo: 'bar'}
      ]);
      vc = new VirtualCollection(collection, {foo: 'bar'});
      vc.each(function (model) {
        result.push(model.id);
      });
      assert.equal(JSON.stringify(result), '[1,3]');
    });
  });

  describe('#indexOf', function () {

    it('should return the index of a model within the virtual collection, not the parent collection', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, foo: 'bar'},
        {id: 2, foo: 'baz'},
        {id: 3, foo: 'bar'}
      ]);
      vc = new VirtualCollection(collection, {foo: 'bar'});
      assert.equal(vc.indexOf(collection.at(2)), 1);
    });
  });

  describe('#_addIndex', function () {
    it('should use comparators to insert the model at the right place in the index', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, ok: true,  foo: 'ccc'},
        {id: 2, ok: false, foo: 'bbb'},
        {id: 3, ok: true,  foo: 'aaa'}
      ], {
        comparator: 'foo' // shortBy foo
      });
      vc = new VirtualCollection(collection, {ok: true});
      collection.add({id: 4, ok: true, foo: 'abc'});
      assert.equal(JSON.stringify(vc.index), '[3,4,1]');
    });
  });
});