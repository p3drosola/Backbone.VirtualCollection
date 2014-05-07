## Backbone.VirtualCollection

<a href="http://teambox.com"><img alt="Built at Teambox" src="http://i.imgur.com/hqNPlHe.png"/></a>

![Build Status](https://api.travis-ci.org/p3drosola/Backbone.VirtualCollection.png)


Backbone.VirtualCollection allows you use display a subset of a Backbone collection in a Backbone view that updates in real time. It works great with Marionette CollectionViews.

### Usage

For example, let's say you have a task collection, and want to show a list of tasks that belong to a specific user.

We can instantiate a virtual collection that only contains tasks that belong to Rupert (who has user_id 13).
The constructor takes two parameters, the first is the parent collection, the second is a options object. The `filter` option specifies a function that takes the model as argument. You can also just specify a hash of attributes to match.

```js
var virtual_collection = new Backbone.VirtualCollection(tasks_collection, {
  filter: function (task) {
    return task.get('user_id') == 13;
  }
});
// or using a hash of attributes to match
virtual_collection = new Backbone.VirtualCollection(tasks_collection, {
  filter: {
    user_id: 13
  }
});

var view = new TaskListView({
  collection: virtual_collection
});

```

The Marionette collection view will only display the tasks that belong to Rupert, and it will update automatically. In other words, when a task is created that belongs to Rupert it will appear, but not if it belongs to Bob.

#### Sorting
Be default, the virtual collection will have the same sorting order as the parent collection. However, a comparator can be specified to change this. The comparator behaves like a Backbone comparator. In other words, you can specify a function or the name of an attribute to sort by.
```js
var virtual_collection = new Backbone.VirtualCollection(tasks_collection, {
  filter: { user_id: 13 },
  comparator: 'name'
});
// tasks in the virtual_collection will be sorted by name
```
You can also change the sorting order on the fly.
```js
virtual_collection.comparator = 'created_at';
virtual_collection.sort(); // triggers sort event
// virtual_collection is now sorted by date, but the parent collection has not changed
```

#### Unbinding
The virtual collection will keep listening to its parent collection until you call `stopListening`.

You can use the helper function `virtual_collection.closeWith` to tell the collection to stopListening when a Marionette view is closed.

```js
var virtual_collection = new Backbone.VirtualCollection(collection, {filter: {foo: 'bar'}});
var view = new Marionette.CollectionView({collection: virtual_collection});
virtual_collection.closeWith(view);
```

Using the helper will take care of unbinding the virtual collection's listeners when the view is closed.

You also can pass a `close_with` option when creating the virtual collection being that an event emitter. The virtual collection will stop listening to events when the `close_with` event emitter emits a `close` event.

```js
var virtual_collection = new Backbone.VirtualCollection(collection, {
  filter: {foo: 'bar'},
  close_with: view
});
```

#### Update filter

It's very common that you'd want to update the filter being used and have the collection view update itself. `updateFilter` takes the same parameters as the original `filter` property (a hash, or a function) and regenerates the virtual collection without losing your view bindings.

```js

virtual_collection.updateFilter({
  the_new: 'properties'
, are: 'lovely'
});

// or

virtual_collection.updateFilter(function (model) {
  return model.foo() === 'bar';
});

```


### Philosophy

#### No data duplication
VirtualCollection does not store, or duplicate any data. We've used other solutions in the past, and duplicating data is just plain bad news.

#### It's Fast
VirtualCollection maintains an internal index of models that pass the filter. That way, using the accessors and iterators (`map`, `each`, etc) is fast. It doesn't have to go through the whole parent collection and re-evaluate all the filters.

> By the way, `VirtualCollection.buildFilterFromHash` is the function that turns a object into a filter function. You might find it useful.

Happy hacking!


### Changelog
```
0.5.0

  No longer attaches to Backbone.VirtualCollection

  VirtualCollection extends Backbone.Collection

  .models()-> .models[] array instead

  fast .get()
  fast ._onAdd()

0.4.15 Added virtual_collection.model (via @fcsonline)
0.4.14 Added Backbone.extend (via @enov)
0.4.13 Optimized `_models` and `get` to access parent collections which are indexed
0.4.12 Pass the correct index in options object on model removal
0.4.11 Trigger `reset` in updateFilter (fixes issue with multilayer filtering)
0.4.10 Added Bower support
0.4.9  Added `where` and `findWhere`. Renamed internal filterFunction
0.4.8  Add `add` and `remove` proxies. Add index argument to filter function.
0.4.7  Add the updateFilter method (via @justinwinslow)
0.4.6  Add toJSON method (via @gbedardsice)
0.4.5  Add close_with option
0.4.4  Add all collection Underscore iterator proxies
0.4.3  Fix bug with onChange handler not proxying add and remove events correctly
0.4.2  Improve importing with npm
0.4.0  Make filter part of options hash. This version breaks backwards compatibility. You'll have to update your code.

0.3.3  Fix sort comparator with two args. Add more iterator helper functions
0.3.2  Fix reset event on parent collection
0.3.1  Replace viewHelper with closeWith
0.3.0  Fix unbinding of index listeners

0.2.0  Use cid instead of ids

0.1.1  Fixed issues with comparators specified as a function
0.1.0  Added support for comparators & sorting, separate from the parent collection
0.0.2  Fix buildFilterFromHash not detecting null values
```

### Pull requests are welcome, naturally

![](http://i.imgur.com/Ikzywtp.gif)

### Contribution management process for project admins
- discuss/edit/merge PR's
- `npm version patch`
- update changelog in README.md
- update version number in component.json, bower.json
- `git push && git push --tags`
- npm publish

### License
The MIT License (MIT)

Copyright (c) 2013 Pedro  p3dro.sola@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
