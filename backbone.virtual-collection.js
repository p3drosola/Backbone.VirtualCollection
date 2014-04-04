VirtualCollection = Backbone.Collection.extend({

  constructor: function (collection, options) {
    this.collection = collection;
    options = options || {};
    if (options.comparator) {
      this.comparator = options.comparator;
    }
    if (!this.model) {
      this.model = collection.model;
    }
    this.accepts = VirtualCollection.buildFilterFromObject(options.filter);
    this._rebuildIndex();
    // this.listenTo(this.collection, 'add', this._onAdd);
  },

  _rebuildIndex: function () {
    this.models = [];
    this.collection.each(function (model) {
      if (this.accepts(model)) {
        this.models.push(model);
      }
    }, this);
  },

  _onAdd: function (model, collection, options) {
    if (this.accepts(model)) {
      this._indexAdd(model);
      this.trigger('add', model, this, options);
    }
  },

  _.indexAdd: function (model) {

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

_.extend(VirtualCollection.prototype, Backbone.Events);
