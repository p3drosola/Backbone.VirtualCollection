
// internal data structure is compatible with
// Backbone.Collection ...
// mind = blown

var VirtualCollection = Backbone.Collection.extend({

  constructor: function (collection, options) {
    options = options || {};
    this.collection = collection;

    if (options.comparator) this.comparator = options.comparator;
    if (options.close_with) this.closeWith(options.close_with);
    if (!this.model) this.model = collection.model;

    this.accepts = VirtualCollection.buildFilterFromObject(options.filter);
    this._rebuildIndex();
    this.initialize.apply(this, arguments);

    this.listenTo(this.collection, 'add', this._onAdd);
  },

  // marionette specific
  closeWith: function (view) {
    view.on('close', function () {
      this.stopListening();
    }, this);
  },

  _rebuildIndex: function () {
    this._reset();
    this.collection.each(function (model) {
      if (this.accepts(model)) {
        this.models.push(model);
        this._byId[model.cid] = model;
        if (model.id) this._byId[model.id] = model;
      }
    }, this);
  },

  _onAdd: function (model, collection, options) {
    if (this.accepts(model)) {
      this._indexAdd(model);
      this.trigger('add', model, this, options);
    }
  },

  _indexAdd: function (model) {
    var i;
    if (this.get(model)) return;
    if (this.comparator || model === this.collection.last()) {
      i = this.length; // custom sort, or append
    } else {
      var orig_index = this.collection.indexOf(model);
      for (i = 0; i < this.length; i++) {
        if (this.collection.indexOf(this.collection.get(this.index[i])) > orig_index) {
          break;
        }
      }
    }

    this.models.splice(i, 0, model);
    this._byId[model.cid] = model;
    if (model.id) this._byId[model.id] = model;

    if (this.comparator) this.sort({silent: true});
  }

}, { // static props

  buildFilterFromObject: function (options) {
    if (!options) {
      return function () { return true; };
    } else if (_.isFunction(options)) {
      return options;
    } else {
      return function (model) {
        return !_.detect(options, function (val, key) {
          return model.get(key) !== val;
        });
      }
    }
  }
});


// add the methods to the prototype so they can be overwritten if need be
_.each(['add', 'remove', 'set', 'reset', 'push', 'pop', 'unshift', 'shift', 'slice', 'sync', 'fetch'], function (method_name) {
  VirtualCollection.prototype[method_name] = function () {
    this.collection[method_name].apply(this.collection, _.toArray(arguments));
  };
});

_.extend(VirtualCollection.prototype, Backbone.Events);
