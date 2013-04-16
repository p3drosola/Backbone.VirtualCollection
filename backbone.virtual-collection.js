(function () {

  var _ = this._, Backbone = this.Backbone, vc;

  // fix for the mocha specs
  if (!_ && (typeof require !== 'undefined')) {
    _ = require('underscore');
    Backbone = require('backbone');
  }

  /**
   * Constructor for the virtual collection
   * @param {Collection} collection
   * @param {Function|Object} filter function, or hash of properties to match
   */
  function VirtualCollection(collection, filter) {
    this.collection = collection;
    _.bindAll(this);

    if (_.isFunction(filter)) {
      this.filter = filter;
    } else if (filter.constructor === Object) {
      this.filter = VirtualCollection.buildFilterFromHash(filter);
    } else {
      throw new TypeError("[filter] argument must be a function or a hash of properties to match");
    }

    // build index
    this.index = [];
    this.collection.each(function (model) {
      if (this.filter(model)) {
        this.index.push(model.id);
      }
    }, this);

    this.length = this.index.length;

    this.listenTo(this.collection, 'add',    this._onAdd,    this);
    this.listenTo(this.collection, 'remove', this._onRemove, this);
    this.listenTo(this.collection, 'change', this._onChange, this);
    this.listenTo(this.collection, 'reset',  this._onReset,  this);
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

  /**
   * Iterates the callback over the elements in the virtual collection
   * @param  {Function} callback
   * @param  {Object}   context, optional
   * @return {Object}   virtual collection
   */
  vc.each = function (callback, context) {
    if (context === undefined) {
      context = this;
    }
    _.each(this.index, function (id) {
      callback.call(context, this.collection.get(id));
    }, this);
    return this;
  };

  /**
   * Returns the index of the model __in__ the virtual collection
   * @param  {Model} model
   * @return {Number} index
   */
  vc.indexOf = function (model) {
    return this.index.indexOf(model.id);
  };

  /**
   * Unbinds listeners used to update the vitual collection's index
   * @return {[type]} [description]
   */
  vc.unbindIndexListeners = function () {
    this.stopListening();
    return this;
  };

  // private

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
    if (_(this.index).contains(model.id)) {
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
    if (this.filter(model)) {
      this._indexAdd(model);
      this.trigger('change', model, options);
    } else {
      this._indexRemove(model);
    }
  };

  /**
   * Handles the collection:reset event
   * @param {Collection} collection
   * @param {Object} object
   */
  vc._onReset = function (collection, options) {
    this.trigger('reset', this, options);
  };

  /**
   * Adds a model to the virtual collection index
   * Inserting it in the correct order
   * @param  {Model} model
   * @return {undefined}
   */
  vc._indexAdd = function (model) {
    if (this.index.indexOf(model.id) === -1) {
      var i, orig_index = this.collection.indexOf(model);
      for (i = 0; i < this.length; i++) {
        if (this.collection.indexOf(this.collection.get(this.index[i])) > orig_index) {
          break;
        }
      }
      this.index.splice(i, 0, model.id);
      this.length = this.index.length;
    }
  };

  /**
   * Removes a model from the virtual collection index
   * @param  {Model} model
   * @return {undefined}
   */
  vc._indexRemove = function (model) {
    var i = this.index.indexOf(model.id);
    if (i !== -1) {
      this.index.splice(i, 1);
      this.length = this.index.length;
    }
  };

  _.extend(vc, Backbone.Events);
  Backbone.VirtualCollection = VirtualCollection;

}());