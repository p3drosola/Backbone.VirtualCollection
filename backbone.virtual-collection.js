(function (global) {
  'use strict';

  var _ = global._, Backbone = global.Backbone, vc, iterators;

  if ((!_  || !Backbone) && (typeof require !== 'undefined')) {
    _ = require('underscore');
    Backbone = require('backbone');
  }

  iterators = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf',
    'isEmpty', 'chain'];

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
    options = options || {};
    this.comparator = options.comparator;

    _.bindAll(this, 'each', 'map', 'get', 'at', 'indexOf', 'sort', 'closeWith',
     '_rebuildIndex', '_models', '_onAdd', '_onRemove', '_onChange', '_onReset',
     '_indexAdd', '_indexRemove');

    if (!options.filter) {
      this.filter = function () { return true; };
    } else if (_.isFunction(options.filter)) {
      this.filter = options.filter;
    } else if (options.filter.constructor === Object) {
      this.filter = VirtualCollection.buildFilterFromHash(options.filter);
    }

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
   * @param  {Object} hash of model attributes
   * @return {Function} filtering function
   */
  VirtualCollection.buildFilterFromHash = function (hash) {
    return function (model) {
      return !Boolean(_(Object.keys(hash)).detect(function (key) {
        return model.get(key) !== hash[key];
      }));
    };
  };

  vc = VirtualCollection.prototype;


  // mix in Underscore method as proxies
  _.each(iterators, function(method) {
    vc[method] = function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(this._models());
      return _[method].apply(_, args);
    };
  });

  /**
   * Returns a model if it belongs to the virtual collection
   * @param  {String} id
   * @return {Model}
   */
  vc.get = function (id) {
    var model = this.collection.get(id);
    if (model && this.filter(model)) {
      return model;
    }
  };

  /**
   * Returns the model at the position in the index
   * @param  {Number} index
   * @return {Model}
   */
  vc.at = function (index) {
    return this.collection.get(this.index[index]);
  };

  /**
   * Returns the index of the model in the virtual collection
   * @param  {Model} model
   * @return {Number} index
   */
  vc.indexOf = function (model) {
    return this.index.indexOf(model.cid);
  };

  /**
   * Sorts the models in the virtual collection
   *
   * You only need to trigger this manually if you change the comparator
   * @param  {Object} options
   * @return {VirtualCollection}
   */
  vc.sort = function (options) {
    var self = this;
    if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
    options = options || {};

    // Run sort based on type of `comparator`.
    if (_.isString(this.comparator)) {
      this.index = _.sortBy(this.index, function (cid) {
        var model = this.collection.get(cid);
        return model.get(this.comparator);
      }, this);
    } else if(this.comparator.length === 1) {
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

    if (!options.silent) this.trigger('sort', this, options);
    return this;
  };

  /**
   * A utility function for unbiding listeners
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
    this.collection.each(function (model) {
      if (this.filter(model)) {
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
   * @return {Array}
   */
  vc._models = function () {
    return _.map(this.index, function (cid) {
      return this.collection.get(cid);
    }, this);
  };

  /**
   * Handles the collection:add event
   * May update the virtual collection's index
   * @param  {Model} model
   * @return {undefined}
   */
  vc._onAdd = function (model, collection, options) {
    if (this.filter(model)) {
      this._indexAdd(model);
      this.trigger('add', model, this, options);
    }
  };

  /**
   * Handles the collection:remove event
   * May update the virtual collection's index
   * @param  {Model} model
   * @return {undefined}
   */
  vc._onRemove = function (model, collection, options) {
    if (_(this.index).contains(model.cid)) {
      this._indexRemove(model);
      this.trigger('remove', model, this, options);
    }
  };

  /**
   * Handles the collection:change event
   * May update the virtual collection's index
   * @param {Model} model
   * @param {Object} object
   */
  vc._onChange = function (model, options) {
    var already_here = _.contains(this.index, model.cid);
    if (this.filter(model)) {
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
   * @param  {Model} model
   * @return {undefined}
   */
  vc._indexRemove = function (model) {
    var i = this.index.indexOf(model.cid);
    if (i !== -1) {
      this.index.splice(i, 1);
      this.length = this.index.length;
    }
  };

  if (!_ && (typeof require !== 'undefined')) {
    _ = require('underscore');
  }
  if (!Backbone && (typeof require !== 'undefined')) {
    Backbone = require('backbone');
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualCollection;
  }
  _.extend(vc, Backbone.Events);

  Backbone.VirtualCollection = VirtualCollection;

}(this));
