!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.VirtualCollection=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){

// Available under the MIT License (MIT)

var VirtualCollection,
    Backbone = (typeof window !== "undefined" ? window.Backbone : typeof global !== "undefined" ? global.Backbone : null),
    _ = (typeof window !== "undefined" ? window._ : typeof global !== "undefined" ? global._ : null);

VirtualCollection = Backbone.Collection.extend({

  constructor: function (collection, options) {
    options = options || {};
    this.collection = collection;

    if (options.name !== undefined) this.name = options.name;
    if (options.comparator !== undefined) this.comparator = options.comparator;
    if (options.close_with) this.bindLifecycle(options.close_with, 'close'); // Marionette 1.*
    if (options.destroy_with) this.bindLifecycle(options.destroy_with, 'destroy'); // Marionette 2.*
    if (!this.model) this.model = collection.model;

    this.accepts = VirtualCollection.buildFilter(options.filter);
    this._rebuildIndex();
    this.listenTo(this.collection, 'add', this._onAdd);
    this.listenTo(this.collection, 'remove', this._onRemove);
    this.listenTo(this.collection, 'change', this._onChange);
    this.listenTo(this.collection, 'reset',  this._onReset);
    this.listenTo(this.collection, 'sort',  this._onSort);

    this.initialize.apply(this, arguments);
  },

  // Marionette 1.*
  bindLifecycle: function (view, method_name) {
    view.on(method_name, _.bind(this.stopListening, this));
  },

  // https://github.com/p3drosola/Backbone.VirtualCollection/issues/62
  get: function(obj) {
    if (obj == null) return void 0;
    return this._byId[obj.cid ? obj.cid : obj.id || obj];
  },

  updateFilter: function (filter) {
    this.accepts = VirtualCollection.buildFilter(filter);
    this._rebuildIndex();
    this.trigger('filter', this, filter);
    this.trigger('reset', this, filter);
    return this;
  },

  _rebuildIndex: function () {
    for(idx in this.models) {
      this.models[idx].off('all', this._onAllEvent, this);
    }
    this._reset();
    this.collection.each(function (model, i) {
      if (this.accepts(model, i)) {
        model.on('all', this._onAllEvent, this);
        this.models.push(model);
        this._byId[model.cid] = model;
        if (model.id) this._byId[model.id] = model;
      }
    }, this);
    this.length = this.models.length;

    if (this.comparator) this.sort({silent: true});
  },

  orderViaParent: function (options) {
    this.models = this.collection.filter(function (model) {
      return (this._byId[model.cid] !== undefined);
    }, this);
    if (!options.silent) this.trigger('sort', this, options);
  },

  _onSort: function (collection, options) {
    if (this.comparator !== undefined) return;
    this.orderViaParent(options);
  },

  _onAdd: function (model, collection, options) {
    var already_here = this.get(model);
    if (!already_here && this.accepts(model, options.index)) {
      this._indexAdd(model);
      model.on('all', this._onAllEvent, this);
      this.trigger('add', model, this, options);
    }
  },

  _onRemove: function (model, collection, options) {
    if (!this.get(model)) return;

    var i = this._indexRemove(model)
    , options_clone = _.clone(options);
    options_clone.index = i;
    model.off('all', this._onAllEvent, this);
    this.trigger('remove', model, this, options_clone);
  },

  _onChange: function (model, options) {
    if (!model || !options) return; // ignore malformed arguments coming from custom events
    var already_here = this.get(model);

    if (this.accepts(model, options.index)) {
      if (already_here) {
        this.trigger('change', model, this, options);
      } else {
        this._indexAdd(model);
        this.trigger('add', model, this, options);
      }
    } else {
      if (already_here) {
        var i = this._indexRemove(model)
        , options_clone = _.clone(options);
        options_clone.index = i;
        this.trigger('remove', model, this, options_clone);
      }
    }
  },

  _onReset: function (collection, options) {
    this._rebuildIndex();
    this.trigger('reset', this, options);
  },

  sortedIndex: function (model, value, context) {
    var iterator = _.isFunction(value) ? value : function(target) {
      return target.get(value);
    };

    if (iterator.length == 1) {
       return _.sortedIndex(this.models, model, iterator, context);
     } else {
       return sortedIndexTwo(this.models, model, iterator, context);
     }
  },

  _indexAdd: function (model) {
    if (this.get(model)) return;
    var i;
    // uses a binsearch to find the right index
    if (this.comparator) {
      i = this.sortedIndex(model, this.comparator, this);
    } else if (this.comparator === undefined) {
      i = this.sortedIndex(model, function (target) {
       //TODO: indexOf traverses the array every time the iterator is called
        return this.collection.indexOf(target);
      }, this);
    } else {
      i = this.length;
    }
    this.models.splice(i, 0, model);
    this._byId[model.cid] = model;
    if (model.id) this._byId[model.id] = model;
    var filled = this.length === 0;
    this.length += 1;
    if (filled) this.trigger('filled');
  },

  _indexRemove: function (model) {
    model.off('all', this._onAllEvent, this);
    var i = this.indexOf(model);
    if (i === -1) return i;
    this.models.splice(i, 1);
    delete this._byId[model.cid];
    if (model.id) delete this._byId[model.id];
    this.length -= 1;
    if (this.length === 0) console.trigger('empty');
    return i;
  },

  _onAllEvent: function (eventName) {
    var explicitlyHandledEvents = ['add', 'remove', 'change', 'reset', 'sort'];
    if (!_.contains(explicitlyHandledEvents, eventName)) {
      this.trigger.apply(this, arguments);
    }
  }

}, { // static props

  buildFilter: function (options) {
    if (!options) {
      return function () {
        return true;
      };
    } else if (_.isFunction(options)) {
      return options;
    } else if (options.constructor === Object) {
      return function (model) {
        return !Boolean(_(Object.keys(options)).detect(function (key) {
          return model.get(key) !== options[key];
        }));
      };
    }
  }
});

// methods that alter data should proxy to the parent collection
_.each(['add', 'remove', 'set', 'reset', 'push', 'pop', 'unshift', 'shift', 'slice', 'sync', 'fetch'], function (method_name) {
  VirtualCollection.prototype[method_name] = function () {
    return this.collection[method_name].apply(this.collection, _.toArray(arguments));
  };
});

/**

Equivalent to _.sortedIndex, but for comparators with two arguments

**/
function sortedIndexTwo (array, obj, iterator, context) {
  var low = 0, high = array.length;
  while (low < high) {
    var mid = (low + high) >>> 1;
    iterator.call(context, obj, array[mid]) > 0 ? low = mid + 1 : high = mid;
  }
  return low;
}

_.extend(VirtualCollection.prototype, Backbone.Events);

module.exports = VirtualCollection;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1])(1)
});