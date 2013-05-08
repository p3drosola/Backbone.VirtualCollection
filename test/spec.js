/*global it, describe, before, beforeEach*/

var assert = require("assert"),
    sinon = require('sinon'),
    _ = require("underscore"),
    Backbone = require("backbone"),
    VirtualCollection;

require('../backbone.virtual-collection');
VirtualCollection = Backbone.VirtualCollection;

function cids(collection, ids_array) {
  var cids_array = [];
  _.each(ids_array, function (id) {
    cids_array.push(collection.get(id).cid);
  })
  return cids_array;
}

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
    it('should a build a filter that finds null values', function () {
      var filter = VirtualCollection.buildFilterFromHash({foo: 'bar', ginger: null});
      assert.equal(false, filter(new Backbone.Model({foo: 'bar', ginger: 'not null'})));
    });
    it('should a build a filter that finds undefined values', function () {
      var filter = VirtualCollection.buildFilterFromHash({foo: 'bar', ginger: undefined});
      assert.equal(false, filter(new Backbone.Model({foo: 'bar', ginger: 'not null'})));
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
      assert.equal(_.isEqual(vc.index, cids(collection, [1, 3])), true);
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
      assert.equal(_.isEqual(vc.index, cids(collection, [1, 3])), true);
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
      assert.equal(_.isEqual(vc.index, cids(collection, [3, 4, 1])), true);
    });
  });

  describe('#comparator', function () {
    it('should sort the index on instanciation', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, name: 'ccc'},
        {id: 2, name: 'aaa'},
        {id: 3, name: 'bbb'}
      ], {
        comparator: 'id'
      });

      vc = new VirtualCollection(collection, {}, { comparator: 'name' });
      assert.equal(_.isEqual(vc.index, cids(collection, [2, 3, 1])), true);
    });
    it('should accept comparator function', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, name: 'ccc'},
        {id: 2, name: 'aaa'},
        {id: 3, name: 'bbb'}
      ], {
        comparator: 'id'
      });

      vc = new VirtualCollection(collection, {}, {
        comparator: function (item) { return item.get('name'); }
      });
      assert.equal(_.isEqual(vc.index, cids(collection, [2, 3, 1])), true);
    });
    it('should keep the index sorted when adding items', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, name: 'ccc'},
        {id: 3, name: 'bbb'}
      ], {
        comparator: 'id'
      });

      vc = new VirtualCollection(collection, {}, { comparator: 'name' });
      assert.equal(_.isEqual(vc.index, cids(collection, [3, 1])), true);

      collection.add({id: 2, name: 'aaa'});
      assert.equal(_.isEqual(vc.index, cids(collection, [2, 3, 1])), true);
    });
  });
  describe('viewHelper', function () {

    it('should apply arguments to the constructor correctly', function () {
      var collection = new Backbone.Collection([
        {id: 1, name: 'ccc', foo: 'bar'},
        {id: 2, name: 'bbb', foo: 'bar'},
        {id: 3, name: 'aaa', foo: 'baz'}
      ], { comparator: 'name' }),
      view = _.extend({}, Backbone.Events),
      vc = VirtualCollection.viewHelper.call(view, collection, {foo: 'bar'}, {comparator: 'name'});

      assert.equal(vc.collection, collection);
      assert.equal(vc.comparator, 'name');
      assert.equal(vc.length, 2);
    });

    it('should clear the collections listenters when the view is closed', function () {
      var collection = new Backbone.Collection([
        {id: 1, name: 'ccc'},
        {id: 2, name: 'bbb'},
        {id: 3, name: 'aaa'}
      ]),
      view = _.extend({}, Backbone.Events),
      vc = VirtualCollection.viewHelper.call(view, collection, {});

      sinon.spy(vc, 'stopListening');
      view.trigger('close');
      assert.equal(vc.stopListening.callCount, 1);
    });

  });
});
