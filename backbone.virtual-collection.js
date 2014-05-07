(function (global, factory) {

  // Set up lib appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'backbone'], factory);

  // Next for Node.js or CommonJS.
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('underscore'), require('backbone'));

  // Finally, use browser globals.
  } else {
    factory(global._, global.Backbone);
  }

}(this, function (_, Backbone) {
  'use strict';

  var vc, iterators, proxy;

  iterators = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf',
    'isEmpty', 'chain', 'pluck'];

  proxy = ['add', 'remove'];

  /**
   * Constructor for the virtual collection
   * @param {Collection} collection
   * @param {Function|Object} filter function, or hash of properties to match
   * @param {Object} options
   *      @param {[Function|Object]} filter function, or hash of properties to match
   *      @param {[Function|String]} comparator
   */
  function VirtualCollection(collection, options) {
    this.collection = collection;
    if (typeof this.collection === 'function') {
      this.collection = new this.collection;
    }
    options = options || {};
    this.comparator = options.comparator;
    this.model = collection.model;

    _.bindAll(this, 'each', 'map', 'get', 'at', 'indexOf', 'sort', 'closeWith',
     '_rebuildIndex', '_models', '_onAdd', '_onRemove', '_onChange', '_onReset',
     '_indexAdd', '_indexRemove');

    // set filter
    this.filterFunction = VirtualCollection.buildFilter(options.filter);

    // build index
    this._rebuildIndex();

    this.listenTo(this.collection, 'add',    this._onAdd,    this);
    this.listenTo(this.collection, 'remove', this._onRemove, this);
    this.listenTo(this.collection, 'change', this._onChange, this);
    this.listenTo(this.collection, 'reset',  this._onReset,  this);

    if (options.close_with) {
      this.closeWith(options.close_with);
    }
  }

  /**
   * [static] Returns a function that returns true for models that meet the specified conditions
   *
   * @param  {Object} hash of model attributes or {Function} filter
   * @return {Function} filtering function
   */
  VirtualCollection.buildFilter = function (filter) {
    if (!filter) {
      // If no filter is passed, all models should be added
      return function () {
        return true;
      };
    } else if (_.isFunction(filter)) {
      // If filter is passed a function, just return it
      return filter;
    } else if (filter.constructor === Object) {
      // If filter is a hash of attributes, return a function that checks each of them
      return function (model) {
        return !Boolean(_(Object.keys(filter)).detect(function (key) {
          return model.get(key) !== filter[key];
        }));
      };
    }
  };

  vc = VirtualCollection.prototype;

  // mix in Underscore method as proxies
  _.each(iterators, function (method) {
    vc[method] = function () {
      var args = Array.prototype.slice.call(arguments)
        , proxyCollection = { models: this._models() };
      return Backbone.Collection.prototype[method].apply(proxyCollection, args);
    };
  });

  // proxy functions to parent
  _.each(proxy, function (method) {
    vc[method] = function () {
      var args = Array.prototype.slice.call(arguments);
      return this.collection[method].apply(this.collection, args);
    };
  });

  /**
   * Returns a model if it belongs to the virtual collection
   *
   * @param  {String} id or cid
   * @return {Model}
   */
  vc.get = function (id) {
    var model = this._getParentCollection().get(id);
    if (model && _.contains(this.index, model.cid)) {
      return model;
    }
  };

  /**
   * Returns the parent non-virtual collection.
   *
   * @return {Collection}
   */
  vc._getParentCollection = function () {
    if (this.collection instanceof VirtualCollection) {
      return this.collection._getParentCollection();
    } else {
      return this.collection;
    }
  };

  /**
   * Returns the model at the position in the index
   *
   * @param  {Number} index
   * @return {Model}
   */
  vc.at = function (index) {
    return this.collection.get(this.index[index]);
  };

  vc.where = Backbone.Collection.prototype.where;
  vc.findWhere = Backbone.Collection.prototype.findWhere;

  /**
   * Returns the index of the model in the virtual collection
   *
   * @param  {Model} model
   * @return {Number} index
   */
  vc.indexOf = function (model) {
    return this.index.indexOf(model.cid);
  };

  /**
   * Returns a JSON representation of all the models in the index
   *
   * @return {Array} JSON models
   */
  vc.toJSON = function () {
    return _.map(this._models(), function (model) {
      return model.toJSON();
    });
  };

  /**
   * Sorts the models in the virtual collection
   *
   * You only need to trigger this manually if you change the comparator
   *
   * @param  {Object} options
   * @return {VirtualCollection}
   */
  vc.sort = function (options) {
    var self = this;

    if (!this.comparator) {
      throw new Error('Cannot sort a set without a comparator');
    }

    options = options || {};

    // Run sort based on type of `comparator`.
    if (_.isString(this.comparator)) {
      this.index = _.sortBy(this.index, function (cid) {
        var model = this.collection.get(cid);
        return model.get(this.comparator);
      }, this);
    } else if (this.comparator.length === 1) {
      this.index = _.sortBy(this.index, function (cid) {
        var model = this.collection.get(cid);
        return this.comparator.call(self, model);
      }, this);
    } else {
      this.index.sort(function (cid1, cid2) {
        var model1 = self.collection.get(cid1),
          model2 = self.collection.get(cid2);

        return self.comparator.call(self, model1, model2);
      });
    }

    if (!options.silent) {
      this.trigger('sort', this, options);
    }

    return this;
  };

  /**
   * Change the filter and update collection
   *
   * @param  {Object} hash of model attributes or {Function} filter
   * @return {VirtualCollection}
   */

  vc.updateFilter = function (filter) {
    // Reset the filter
    this.filterFunction = VirtualCollection.buildFilter(filter);

    // Update the models
    this._rebuildIndex();

    // Trigger filter event
    this.trigger('filter', this, filter);

    // Trigger reset event
    this.trigger('reset', this, filter);

    return this;
  };

  /**
   * A utility function for unbiding listeners
   *
   * @param  {View} view (marionette view)
   */
  vc.closeWith = function (view) {
    view.on('close', function () {
      this.stopListening();
    }, this);
  };

  // private

  vc._rebuildIndex = function () {
    this.index = [];

    this.collection.each(function (model, index) {
      if (this.filterFunction(model, index)) {
        this.index.push(model.cid);
      }
    }, this);

    if (this.comparator) {
      this.sort({silent: true});
    }

    this.length = this.index.length;
  };

  /**
   * Returns an array of models in the virtual collection
   *
   * @return {Array}
   */
  vc._models = function () {
    var parentCollection = this._getParentCollection();

    return _.map(this.index, function (cid) {
      return parentCollection.get(cid);
    }, this);
  };

  /**
   * Handles the collection:add event
   * May update the virtual collection's index
   *
   * @param  {Model} model
   * @return {undefined}
   */
  vc._onAdd = function (model, collection, options) {
    if (this.filterFunction(model)) {
      this._indexAdd(model);
      this.trigger('add', model, this, options);
    }
  };

  /**
   * Handles the collection:remove event
   * May update the virtual collection's index
   *
   * @param  {Model} model
   * @return {undefined}
   */
  vc._onRemove = function (model, collection, options) {
    if (_(this.index).contains(model.cid)) {
      var i = this._indexRemove(model)
        , options_clone;

      if (options) {
        options_clone = _.clone(options);
        options_clone.index = i;
      }

      this.trigger('remove', model, this, options_clone);
    }
  };

  /**
   * Handles the collection:change event
   * May update the virtual collection's index
   *
   * @param {Model} model
   * @param {Object} object
   */
  vc._onChange = function (model, options) {
    var already_here = _.contains(this.index, model.cid);

    if (this.filterFunction(model)) {
      if (already_here) {
        this.trigger('change', model, this, options);
      } else {
        this._indexAdd(model);
        this.trigger('add', model, this, options);
      }
    } else {
      if (already_here) {
        this._indexRemove(model);
        this.trigger('remove', model, this, options);
      }
    }
  };

  /**
   * Handles the collection:reset event
   *
   * @param {Collection} collection
   * @param {Object} object
   */
  vc._onReset = function (collection, options) {
    this._rebuildIndex();
    this.trigger('reset', this, options);
  };

  /**
   * Adds a model to the virtual collection index
   * Inserting it in the correct order
   *
   * @param  {Model} model
   * @return {undefined}
   */
  vc._indexAdd = function (model) {
    if (this.index.indexOf(model.cid) === -1) {

      if (!this.comparator) { // order inherit's from parent collection
        var i, orig_index = this.collection.indexOf(model);
        for (i = 0; i < this.length; i++) {
          if (this.collection.indexOf(this.collection.get(this.index[i])) > orig_index) {
            break;
          }
        }
        this.index.splice(i, 0, model.cid);

      } else { // the virtual collection has a custom order
        this.index.push(model.cid);
        this.sort({silent: true});
      }
      this.length = this.index.length;
    }
  };

  /**
   * Removes a model from the virtual collection index
   *
   * @param  {Model} model
   * @return {int} the index for the removed model or -1 if not found
   */
  vc._indexRemove = function (model) {
    var i = this.index.indexOf(model.cid);

    if (i !== -1) {
      this.index.splice(i, 1);
      this.length = this.index.length;
    }

    return i;
  };

  _.extend(vc, Backbone.Events);
  
  VirtualCollection.extend = Backbone.Collection.extend;

  Backbone.VirtualCollection = VirtualCollection;

  return VirtualCollection;
}));
