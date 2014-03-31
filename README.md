JsonDB
======

Json database for rapid prototyping, The JsonDB is a wrapper on top of levelup to store and share Json objects.

Instancing :
-----------

you instance a JSonDB on the server like that : 

```
var jsondb = require('jsondb'),
    levelup = require('level');

var db = jsondb(levelup('path_to_where_store_data');

You generaly NEVER use directly the database for querying/inserting data, but use View :
```
var myView = db.view('my/path');
```

View methods :

* value: function value(callback)
    retrieve the value from the current node :
    ```
    myView.value(function (err, data) {
        //err is null if no error
        //data contains the value
    })
    ```
    the `callback` will be called each time the value change
    
* bind: function bind(callback)
    retrieve the value from the current node, the `callback` will be called each time the value change
    ```
    myView.bind(function (err, data) {
        //err is null if no error
        //data contains the value
    });
    ```
    
* set: function set(data, callback)
    set the current node value
    ```
    myView.set({foo:'bar'});
    ```
    
* push: function push(data, callback)
    push data on the current node value (the node value is now an array)
    ```
    myView.push({foo:'bar'});
    ```

* splice: function splice(index, callback)
    remove an index from the node array
    ```
    myView.splice(2);
    ```
    remove index 2 from the array
    
* get: function subview(url)
    get a subview
    ```
    myView.get('mynewNode');
    myView.get('mynewNode/myOtherSubnode');
    myView.get('mynewNode').get('myOtherSubnode');
    ```
* addChangeListener(callback)
    add a listener that is called when change occur at this node

* removeChangeListener(callback)
    remove a listener 

* removeAllChangeListeners()
    remove all listeners 
    
* dispose: function dispose()
    dispose the view

```
