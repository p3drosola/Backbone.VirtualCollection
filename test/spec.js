/*global it, describe, before, beforeEach*/

var assert = require("assert"),
    sinon = require('sinon'),
    _ = require("underscore"),
    Backbone = require("backbone");

eval(require('fs').readFileSync('backbone.virtual-collection.js', 'utf8'));

function cids(collection, ids_array) {
  var cids_array = [];
  _.each(ids_array, function (id) {
    cids_array.push(collection.get(id).cid);
  })
  return cids_array;
}

describe('Backbone.VirtualCollection', function () {

  describe('#constructor', function () {

    it("should bind 4 listeners to it's collection", function () {
      var vc, calls, collection = new Backbone.Collection([{foo: 'bar'}, {foo: 'baz'}]);
      sinon.spy(collection, 'on');
      vc = new VirtualCollection(collection);
      calls = JSON.stringify(_.map(collection.on.args, function (i) {return i[0]; }));
      assert.equal(calls, JSON.stringify([ 'add', 'remove', 'change', 'reset', 'sort' ]));
    });

    it('should build an index on instanciation', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, foo: 'bar'},
        {id: 2, foo: 'baz'},
        {id: 3, foo: 'bar'}
      ]);
      vc = new VirtualCollection(collection, {
        filter: {foo: 'bar'}
      });
      assert.equal(vc.models.length, 2);
    });

    it("should accept a close_with option and bind close event", function () {
      var vc, calls, collection, event_emitter;
      collection = new Backbone.Collection([{id: 1, foo: 'bar'}]);
      event_emitter = Backbone.Events;
      sinon.spy(event_emitter, 'on');
      vc = new VirtualCollection(collection, {close_with: event_emitter});
      calls = JSON.stringify(_.map(event_emitter.on.args, function (i) {return i[0]; }));
      assert.equal(calls, JSON.stringify([ 'close' ]));
    });
  });

  describe('#model', function () {

    it("should inherit the parent collection type model", function () {
      var vc, collection, Library;

      Library = Backbone.Collection.extend({
        model: Backbone.Model
      });

      collection = new Library([{foo: 'bar'}, {foo: 'baz'}]);
      vc = new VirtualCollection(collection);
      assert.equal(vc.model, collection.model);
    });

  });

  describe('#each', function () {

    it('should iterate over the index in order', function () {
      var vc, result = [], collection = new Backbone.Collection([
        {id: 1, foo: 'bar'},
        {id: 2, foo: 'baz'},
        {id: 3, foo: 'bar'}
      ]);
      vc = new VirtualCollection(collection, {
        filter: {foo: 'bar'}
      });
      vc.each(function (model) {
        result.push(model);
      });
      assert.deepEqual(result, vc.models);
    });
  });

  describe('#indexOf', function () {

    it('should return the index of a model within the virtual collection, not the parent collection', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, foo: 'bar'},
        {id: 2, foo: 'baz'},
        {id: 3, foo: 'bar'}
      ]);
      vc = new VirtualCollection(collection, {
        filter: {foo: 'bar'}
      });
      assert.equal(vc.indexOf(collection.at(2)), 1);
    });
  });

  describe('#where', function () {
    it('finds all the models matching attributes', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, foo: 'bar'},
        {id: 2, foo: 'baz'},
        {id: 3, foo: 'bar'}
      ]);
      vc = new VirtualCollection(collection, {filter: {foo: 'bar'}});
      assert.equal(vc.where({foo: 'bar'}).length, 2);
    });
  });

  describe('#findWhere', function () {
    it('finds the first model matching attributes', function () {
      var vc, collection = new Backbone.Collection([
        {id: 10, foo: 'bar'},
        {id: 20, foo: 'baz'},
        {id: 30, foo: 'bar'}
      ]);
      vc = new VirtualCollection(collection, {filter: {foo: 'bar'}});
      assert.equal(vc.findWhere({foo: 'bar'}).id, 10);
    });
  });

  describe('#pluck', function () {
    it('returns an array of ids', function () {
      var vc, collection = new Backbone.Collection([
        {id: 10, foo: 'bar'},
        {id: 20, foo: 'baz'},
        {id: 30, foo: 'bar'}
      ]);
      vc = new VirtualCollection(collection, {filter: {foo: 'bar'}});
      assert.deepEqual(vc.pluck('id'), [10, 30]);
    });

    it('returns an array of field values', function () {
      var vc, collection = new Backbone.Collection([
        {id: 10, foo: 'bar'},
        {id: 20, foo: 'baz'},
        {id: 30, foo: 'bar'}
      ]);
      vc = new VirtualCollection(collection, {filter: {foo: 'bar'}});
      assert.deepEqual(vc.pluck('foo'), ['bar', 'bar']);
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
      vc = new VirtualCollection(collection, {
        filter: {ok: true}
      });
      collection.add({id: 4, ok: true, foo: 'abc'});
      assert.deepEqual(vc.pluck('id'), [3,4,1]);
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

      vc = new VirtualCollection(collection, {
        comparator: 'name'
      });
      assert.deepEqual(vc.pluck('id'), [2, 3, 1]);
    });
    it('should accept comparator function', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, name: 'ccc'},
        {id: 2, name: 'aaa'},
        {id: 3, name: 'bbb'}
      ], {
        comparator: 'id'
      });

      vc = new VirtualCollection(collection, {
        comparator: function (item) { return item.get('name'); }
      });
      assert.deepEqual(vc.pluck('id'), [2, 3, 1]);
    });
    it('should accept a comparator function that compares two models', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, name: 'ccc'},
        {id: 2, name: 'aaa'},
        {id: 3, name: 'bbb'}
      ], {
        comparator: 'id'
      });

      vc = new VirtualCollection(collection, {
        // sort by string DESC
        comparator: function (a, b) { return a.get('name') < b.get('name') ? 1 : -1; }
      });
      assert.deepEqual(vc.pluck('id'), [1, 3, 2]);
    });
    it('should keep the index sorted when adding items', function () {
      var vc, collection = new Backbone.Collection([
        {id: 1, name: 'ccc'},
        {id: 3, name: 'bbb'}
      ], {
        comparator: 'id'
      });

      vc = new VirtualCollection(collection, { comparator: 'name' });
      assert.deepEqual(vc.pluck('id'), [3, 1]);

      collection.add({id: 2, name: 'aaa'});
      assert.deepEqual(vc.pluck('id'), [2, 3, 1]);
    });

    it('should update the index when reset is triggered on the parent collection', function () {
      var collection = new Backbone.Collection([
        {type: 'a'},
        {type: 'a'},
        {type: 'b'} ]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'b'}
      });
      collection.reset([
        new Backbone.Model({type: 'b'}),
        new Backbone.Model({type: 'b'}),
        new Backbone.Model({type: 'b'})]);

      assert.equal(vc.length, collection.length);
    })
  });

  describe('closeWith', function () {
    it('should clear the collections listenters when the view is closed', function () {
      var collection = new Backbone.Collection([
        {id: 1, name: 'ccc'},
        {id: 2, name: 'bbb'},
        {id: 3, name: 'aaa'}
      ]),
      view = _.extend({}, Backbone.Events),
      vc = new VirtualCollection(collection);

      sinon.spy(vc, 'stopListening');
      vc.closeWith(view);
      view.trigger('close');
      assert.equal(vc.stopListening.callCount, 1);
    });
  });

  describe('map', function () {
    it('should map over the virtual collections model array', function () {
      var collection = new Backbone.Collection([
        {type: 'a', name: 'hodor'},
        {type: 'a', name: 'khalesi'},
        {type: 'b'} ]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      }),
      context = {foo: ' bar'};
      assert.deepEqual(vc.map(function (m) { return m.get('name') + this.foo; }, context), ['hodor bar', 'khalesi bar']);
    });
  });

  describe('each', function () {
    it('should interate over the models', function () {
      var collection = new Backbone.Collection([
        {type: 'a', name: 'hodor'},
        {type: 'a', name: 'khalesi'},
        {type: 'b'} ]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      }),
      context = {foo: ' bar'}
      collect = [];

      vc.each(function (m) { collect.push(m.get('name') + this.foo); }, context);
      assert.deepEqual(collect, ['hodor bar', 'khalesi bar']);
    });
  });

  describe('get', function () {
    it('should return the model if it belongs in the virtual collection', function () {
      var collection = new Backbone.Collection([
        {type: 'a', id: 1},
        {type: 'b', id: 2}]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      });

      assert.equal(vc.get(1), collection.get(1));
      assert.equal(vc.get(2), undefined);
    });
  });

  describe('at', function () {
    it('should return the model at the specified index of the virtual collection', function () {
      var collection = new Backbone.Collection([
        {type: 'a', id: 1},
        {type: 'b', id: 2}]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'b'}
      });

      assert.equal(vc.at(0), collection.get(2));
    });
  });

  describe('toJSON', function() {
    it('should return a JSON representation of the models of the virtual collection', function() {
      var collection = new Backbone.Collection([
        {age: 23, name: 'John'},
        {age: 44, name: 'Papa'},
        {age: 44, name: 'Terry'}
      ]);
      vc = new VirtualCollection(collection, {
        filter: {age: 44}
      });

      assert.deepEqual(vc.toJSON(), [
        {age: 44, name: 'Papa'},
        {age: 44, name: 'Terry'}
      ]);
    });
  });

  describe('add & remove', function () {
    it('should proxy up to the parent', function () {
      var collection = new Backbone.Collection([]);
      vc = new VirtualCollection(collection, {});
      vc.add({id: 2});
      assert.equal(collection.length, 1);
      vc.remove(collection.at(0));
      assert.equal(collection.length, 0);
    });
  });

  describe('filter function', function () {
    it('should recieve the model and index as arguments', function () {
      var i = 0,
      collection = new Backbone.Collection([{id: 1}, {id: 2}]);

      vc = new VirtualCollection(collection, {
        filter: function (model, index) {
          assert.equal(model.id, i + 1);
          assert.equal(index, i);
          i++;
        }
      });

    });
  });

  describe('buildFilter', function () {

    it('should build an filter that accepts one correct attribute', function () {
      var filter = VirtualCollection.buildFilter({foo: 'bar'});
      assert.equal(true, filter(new Backbone.Model({foo: 'bar'})));
    });
    it('should build an filter that rejects one false attribute', function () {
      var filter = VirtualCollection.buildFilter({foo: 'bar'});
      assert.equal(false, filter(new Backbone.Model({foo: 'car'})));
    });
    it('should build an filter that accepts multiple correct attributes', function () {
      var filter = VirtualCollection.buildFilter({foo: 'bar', ginger: 'ale'});
      assert.equal(true, filter(new Backbone.Model({foo: 'bar', ginger: 'ale'})));
    });
    it('should build an filter that rejects a missing attribute', function () {
      var filter = VirtualCollection.buildFilter({foo: 'bar', ginger: 'ale'});
      assert.equal(false, filter(new Backbone.Model({foo: 'bar'})));
    });
    it('should a build a filter that finds null values', function () {
      var filter = VirtualCollection.buildFilter({foo: 'bar', ginger: null});
      assert.equal(false, filter(new Backbone.Model({foo: 'bar', ginger: 'not null'})));
    });
    it('should a build a filter that finds undefined values', function () {
      var filter = VirtualCollection.buildFilter({foo: 'bar', ginger: undefined});
      assert.equal(false, filter(new Backbone.Model({foo: 'bar', ginger: 'not null'})));
    });
  });
  describe('events', function () {
    it('should trigger reset when the parent collection is reset', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      }), called = false;

      vc.on('reset', function () { called = true; });
      collection.reset([{type: 'a'}, {type: 'a'}]);

      assert(called);
      assert.equal(vc.length, 2);
    });
    it('should trigger add when a matching model is added to the parent', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      }), called = false;

      vc.on('add', function () { called = true; });
      collection.add({type: 'a'});

      assert(called);
      assert.equal(vc.length, 2);
    });
    it('should not trigger add when a model (not matching) is added to the parent', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      }), called = false;

      vc.on('add', function () { called = true; });
      collection.add({type: 'b'});

      assert(!called);
      assert.equal(vc.length, 1);
    });
    it('should trigger remove when a matching model is removed from the parent', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      }), called = false;

      vc.on('remove', function () { called = true; });
      collection.remove(collection.at(0));

      assert(called);
      assert.equal(vc.length, 0);
    });
    it('should not trigger remove when a model (not matching) is removed from the parent', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      }), called = false;

      vc.on('remove', function () { called = true; });
      collection.remove(collection.at(1));

      assert(!called);
      assert.equal(vc.length, 1);
    });

    it('should trigger remove when a model no longer passes the filter', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      }), called = false;

      vc.on('remove', function () { called = true; });
      collection.at(0).set({type: 'b'});

      assert(called);
      assert(vc.length === 0);
    });
    it('should trigger add when a model is modified to pass the filter', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      }), called = false;

      vc.on('add', function () { called = true; });
      collection.at(1).set({type: 'a'});

      assert(called);
      assert(vc.length === 2);
    });
    it('should trigger change when a model that belongs to the VC is changed', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      }), called = false;

      vc.on('change', function () { called = true; });
      collection.at(0).set({foo: 'bar'});

      assert(called);
      assert(vc.length === 1);
    });
    it('should trigger `filter` when updateFilter is called', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
      filter = sinon.stub(),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      });

      vc.on('filter', filter);
      vc.updateFilter({type: 'b'});

      assert(filter.called);
      assert(vc.length === 1);
    });
    it('should trigger `reset` when updateFilter is called', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
      reset = sinon.stub(),
      vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      });

      vc.on('reset', reset);
      vc.updateFilter({type: 'b'});

      assert(reset.called);
      assert(vc.length === 1);
    });
    it('should not call the filter function when looping the collection', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
          filterFunction;

      filterFn = function (model) {
        return model.get('type') === 'a';
      };

      vc = new VirtualCollection(collection, {
        filter: filterFn
      });

      sinon.spy(vc, 'accepts');

      vc.each(function(model) {
        //looping collection
      });

      assert(!vc.accepts.called);
    });
    it('should not call `get` when looping multiple level nested virtual collections', function () {
      var collection = new Backbone.Collection([{type: 'a'}, {type: 'b'}]),
          filterFunction;

      grandpa_vc = new VirtualCollection(collection, {
        filter: {type: 'a'}
      });

      daddy_vc = new VirtualCollection(grandpa_vc, {
        filter: {type: 'a'}
      });

      vc = new VirtualCollection(daddy_vc, {
        filter: {type: 'a'}
      });

      sinon.spy(collection, 'get');
      sinon.spy(vc, 'get');
      sinon.spy(daddy_vc, 'get');
      sinon.spy(grandpa_vc, 'get');

      vc.each(function(model) {
        //looping collection
      });

      assert(!vc.get.called);
      assert(!daddy_vc.get.called);
      assert(!grandpa_vc.get.called);
      assert(!collection.get.called);
    });

  });
});
