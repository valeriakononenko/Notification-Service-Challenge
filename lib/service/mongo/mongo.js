

/**
 * @type {{db: string, host: string, port: number}}
 */
service.mongo.CONFIG = {
  'db': 'test',
  'host': 'localhost',
  'port': 27017
};


/**
 * @param {!Object} config
 */
service.mongo.init = function(config) {
  service.mongo.CONFIG = config || service.mongo.CONFIG;
};


/**
 * @param {!Object} config
 * @return {async.Step}
 */
service.mongo.getDb = function(config) {

  /**
   * @param {!async.Input} input
   * @param {!async.CompleteHandler} complete
   * @param {!async.ErrorHandler} cancel
   */
  function get(input, complete, cancel) {
    var db = new mongodb.Db(config.db,
        new mongodb.Server(config.host, config.port), {safe: false});

    db.open(function(error, db) {
      if (!error) {
        complete(db);
      } else {
        cancel(error);
      }
    });
  }

  return async.esc(get);
};


/**
 * @param {string} name
 * @return {async.Step}
 */
service.mongo.getCollection = function(name) {

  /**
   * @param {!Db} db
   * @param {function(!Collection)} complete
   * @param {!async.ErrorHandler} cancel
   */
  function get(db, complete, cancel) {
    db.collection(name, function(error, collection) {
      if (!error) {
        complete(collection);
      } else {
        cancel(error);
      }
    });
  }

  return async.esc(get);
};


/**
 * @param {function()} map
 * @param {function(string, !Array.<*>): !Object} reduce
 * @param {string} output
 * @return {!async.Step}
 */
service.mongo.mapReduce = function(map, reduce, output) {

  function mapReduce(collection, complete, cancel) {
    collection.mapReduce(map, reduce, {out: output},
        function(error, collection) {
          if (!error) {
            complete(collection);
          } else {
            cancel(error);
          }
        });
  }

  return async.esc(mapReduce);
};


/**
 * @param {!Collection} collection
 * @param {!async.CompleteHandler} complete
 * @param {!async.ErrorHandler} cancel
 */
service.mongo.getAll = function(collection, complete, cancel) {
  collection.find().toArray(
      function(error, items) {
        if (!error) {
          complete(items);
        } else {
          cancel(error);
        }
      });
};
