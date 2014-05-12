
// internal data structure is compatible with
// Backbone.Collection ...
// mind = blown

var VirtualCollection = Backbone.Collection.extend({

  constructor: function (collection, options) {
    options = options || {};
    this.collection = collection;

    if (options.comparator) {
      this.comparator = options.comparator;
    } else if (!this.comparator) {
      this.comparator = collection.comparator;
    }

    if (options.close_with) this.closeWith(options.close_with);
    if (!this.model) this.model = collection.model;

    this.accepts = VirtualCollection.buildFilter(options.filter);
    this._rebuildIndex();
    this.listenTo(this.collection, 'add', this._onAdd);
    this.listenTo(this.collection, 'remove', this._onRemove);
    this.listenTo(this.collection, 'change', this._onChange);
    this.listenTo(this.collection, 'reset',  this._onReset);

    this.initialize.apply(this, arguments);
  },

  // marionette specific
  closeWith: function (view) {
    view.on('close', _.bind(this.stopListening, this));
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

  _onAdd: function (model, collection, options) {
    if (this.accepts(model, options.index)) {
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


  _indexAdd: function (model) {
    if (this.get(model)) return;
    // uses a binsearch to find the right index
    var i = this.sortedIndex(model, this.comparator, this);
    this.models.splice(i, 0, model);
    this._byId[model.cid] = model;
    if (model.id) this._byId[model.id] = model;

    this.length = this.models.length;
  },

  _indexRemove: function (model) {
    var i = this.indexOf(model);
    if (i !== -1) {
      this.models.splice(i, 1);
      this.length = this.models.length;
    }
    return i;
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

// mix in additional Underscore methods
var slice = [].slice;
_.each(['sortedIndex'], function(method) {
  if (!_[method]) return;
  VirtualCollection.prototype[method] = function() {
    var args = slice.call(arguments);
    args.unshift(this.models);
    return _[method].apply(_, args);
  };
});

// methods that alter data should proxy to the parent collection
_.each(['add', 'remove', 'set', 'reset', 'push', 'pop', 'unshift', 'shift', 'slice', 'sync', 'fetch'], function (method_name) {
  VirtualCollection.prototype[method_name] = function () {
    return this.collection[method_name].apply(this.collection, _.toArray(arguments));
  };
});

_.extend(VirtualCollection.prototype, Backbone.Events);
