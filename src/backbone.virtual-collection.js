
// Available under the MIT License (MIT);

var VirtualCollection = Backbone.VirtualCollection = Backbone.Collection.extend({

  constructor: function (collection, options) {
    options = options || {};
    this.collection = collection;

    if (options.comparator !== undefined) this.comparator = options.comparator;
    if (options.close_with) this.bindLifecycle(options.close_with, 'close'); // Marionette 1
    if (options.destroy_with) this.bindLifecycle(options.destroy_with, 'destroy'); // Marionette 2
    if (collection.model) this.model = collection.model;

    this.accepts = VirtualCollection.buildFilter(options.filter);
    this.listenTo(this.collection, 'all', this._handleParentEvent)
    this._rebuildIndex();
    this.initialize.apply(this, arguments);
  },

  bindLifecycle: function (view, method_name) {
    this.listenTo(view, method_name, this.stopListening);
  },

  updateFilter: function (filter) {
    this.accepts = VirtualCollection.buildFilter(filter);
    this._rebuildIndex();
    this.trigger('filter', this, filter);
    this.trigger('reset', this, filter);
    return this;
  },

  _rebuildIndex: function () {
    this._reset();
    this.collection.each(function (model, i) {
      if (this.accepts(model, i)) {
        this.models.push(model);
        this._byId[model.cid] = model;
        if (model.id) this._byId[model.id] = model;
      }
    }, this);
    this.length = this.models.length;

    if (this.comparator) this.sort({silent: true});
  },

  _handleParentEvent: function (event, target) {
    var args_with_name = _.toArray(arguments);
    var args = args_with_name.slice(1);
    if (target == this.collection) {
      switch (event) {
        case 'reset':
          return this._onReset.apply(this, args);
        case 'sort':
          return this._onSort.apply(this, args);
      }
      return this.trigger.apply(this, args_with_name);
    } else if (target instanceof Backbone.Model) {
      switch (event) {
        case 'add':
          return this._onAdd.apply(this, args);
        case 'change':
          return this._onChange.apply(this, args);
        case 'remove':
          return this._onRemove.apply(this, args);
      }
      return this.trigger.apply(this, args_with_name);
    }
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
      this.trigger('add', model, this, options);
    }
  },

  _onRemove: function (model, collection, options) {
    if (!this.get(model)) return;

    var i = this._indexRemove(model)
    , options_clone = _.clone(options);
    options_clone.index = i;
    this.trigger('remove', model, this, options_clone);
  },

  _onChange: function (model, options) {
    if (!model || !options) return; // ignore malformed arguments coming from custom events
    var already_here = this.get(model);

    if (this.accepts(model, options.index)) {
      if (already_here) {
        if (!this._byId[model.id] && model.id) {
          this._byId[model.id] = model;
        }
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
    this.length += 1;
  },

  _indexRemove: function (model) {
    var i = this.indexOf(model);
    if (i === -1) return i;
    this.models.splice(i, 1);
    delete this._byId[model.cid];
    if (model.id) delete this._byId[model.id];
    this.length -= 1;
    return i;
  },

  clone: function () {
    return new this.collection.constructor(this.models);
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
        return !Boolean(_(_.keys(options)).detect(function (key) {
          return model.get(key) !== options[key];
        }));
      };
    }
  }
});

// methods that alter data should proxy to the parent collection
_.each(['add', 'remove', 'set', 'reset', 'push', 'pop', 'unshift', 'shift', 'slice', 'sync', 'fetch', 'url'], function (method_name) {
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
