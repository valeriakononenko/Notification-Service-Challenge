

var util = require('util');
var http = require('http');

var kue = require('kue');
var mongodb = require('mongodb');
var async = require('node-async');


var config = require('../var/config/config.json');
var vk = require('../var/mock/vkontakte-api.js');


/**
 * @namespace
 */
var service = {};


/**
 * @namespace
 */
service.mongo = {};


/**
 * @namespace
 */
service.queue = {};


/**
 * @namespace
 */
service.rest = {};


/**
 * @type {number}
 */
service.MAX_ID_COUNT = 100;


/**
 * @type {string}
 */
service.TEMPLATE_TAG = '%name%';


/**
 * @this {mongodb}
 */
service.mapPlayers = function() {
  emit(this.first_name, this.vk_id);
};


/**
 * @param {string} key
 * @param {!Array.<number>} values
 * @return {string}
 */
service.reducePlayers = function(key, values) {
  return values.toString();
};


/**
 * @param {string} marker
 * @param {string} template
 * @param {string} tag
 * @param {number=} opt_idCount
 * @return {!async.Step}
 */
service.createNotification = function(marker, template, tag, opt_idCount) {

  /**
   * @param {!Object} data
   * @param {function(!Array.<!service.queue.Notification>)} complete
   * @param {!async.ErrorHandler} cancel
   */
  function createNotification(data, complete, cancel) {
    if (typeof data['_id'] === 'string' &&
        typeof data['value'] === 'string') {

      var notifications = [];
      var text = template.replace(tag, data['_id']);
      var ids = data['value'].split(',');
      var maxIdCount = opt_idCount || service.MAX_ID_COUNT;
      var i = 0;

      while (i < Math.ceil(ids.length / maxIdCount)) {
        var start = i * maxIdCount;
        var stop = start + maxIdCount;

        notifications.push(new service.queue.Notification(
            ids.slice(start, stop), text, marker));

        i += 1;
      }

      complete(notifications);
    } else {
      cancel('Invalid data. [' + JSON.stringify(data) + ']');
    }
  }

  return async.esc(createNotification);
};


/**
 * @param {Job} job
 * @param {!async.CompleteHandler} complete
 * @param {!async.ErrorHandler} cancel
 */
service.sendVkNotification = function(job, complete, cancel) {
  if (typeof job['data'] !== 'undefined' &&
      typeof job['data']['ids'] === 'string' &&
      typeof job['data']['text'] === 'string') {

    vk.sendNotification(job['data']['ids'], job['data']['text'],
        function(error, result) {
          if (!error) {
            complete(result);
          } else {
            cancel(error);
          }
        });
  } else {
    cancel('Invalid job\'s data. [' + JSON.stringify(job) + ']');
  }

};


/**
 * @enum {string}
 */
service.mongo.Collection = {
  PLAYERS: 'players',
  NOTIFICATIONS: 'notifications'
};


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



/**
 * @interface
 */
service.queue.ITask = function() {};


/**
 * @return {string}
 */
service.queue.ITask.prototype.getType = function() {};


/**
 * @return {string}
 */
service.queue.ITask.prototype.getPriority = function() {};


/**
 * @return {!Object}
 */
service.queue.ITask.prototype.serialize = function() {};



/**
 * @param {string} type
 * @param {string=} opt_priority
 *
 * @constructor
 * @implements {service.queue.ITask}
 */
service.queue.Task = function(type, opt_priority) {

  /**
   * @type {string}
   */
  this.__type = type;

  /**
   * @type {string}
   */
  this.__priority = opt_priority || 'normal';

};


/**
 * @inheritDoc
 */
service.queue.Task.prototype.getType = function() {
  return this.__type;
};


/**
 * @inheritDoc
 */
service.queue.Task.prototype.getPriority = function() {
  return this.__priority;
};


/**
 * @inheritDoc
 */
service.queue.Task.prototype.serialize = function() {
  return {
    'type': this.__type
  };
};



/**
 * @param {!Array.<string>} ids
 * @param {string} text
 * @param {string} marker
 * @param {string=} opt_priority
 *
 * @constructor
 * @extends {service.queue.Task}
 */
service.queue.Notification = function(ids, text, marker, opt_priority) {
  service.queue.Task.call(this, 'notification', opt_priority);

  /**
   * @type {!Array.<string>}
   */
  this.__ids = ids;

  /**
   * @type {string}
   */
  this.__text = text;

  /**
   * @type {string}
   */
  this.__marker = marker;

};

util.inherits(service.queue.Notification, service.queue.Task);


/**
 * @inheritDoc
 */
service.queue.Notification.prototype.serialize = function() {
  return {
    'title': this.__marker,
    'ids': this.__ids.toString(),
    'text': this.__text
  };
};


/**
 * @type {!Queue}
 */
service.queue.__q = kue.createQueue();


/**
 * @type {number}
 */
service.queue.card = 0;


/**
 * @type {number}
 */
service.queue.ITEM_ATTEMPTS = 100;


/**
 * @type {number}
 */
service.queue.ITEM_LIMIT = 1000;


/**
 * @type {number}
 */
service.queue.ITEM_CONCURRENCY = 3;


/**
 * @param {!Object} config
 */
service.queue.init = function(config) {

  service.queue.ITEM_ATTEMPTS = config.attempts || service.queue.ITEM_ATTEMPTS;

  service.queue.ITEM_LIMIT = config.limit || service.queue.ITEM_LIMIT;

  service.queue.ITEM_CONCURRENCY =
      config.concurrency || service.queue.ITEM_CONCURRENCY;

  var port = Number(config.port) || 3000;

  kue.app.listen(port);
  console.log('UI started on port ' + String(port) + '\n');
};


/**
 * @param {number=} opt_attempts
 * @param {number=} opt_delay
 * @return {!async.Step}
 */
service.queue.createJob = function(opt_attempts, opt_delay) {

  /**
   * @param {!service.queue.ITask} task
   * @param {!async.CompleteHandler} complete
   * @param {!async.ErrorHandler} cancel
   */
  function create(task, complete, cancel) {

    if (task instanceof service.queue.Task) {
      service.queue.__q.createJob(task.getType(), task.serialize())
          .priority(task.getPriority())
          .attempts(opt_attempts || 1)
          .delay(opt_delay || 0)
          .save();
      complete();
    } else {
      complete('Can\'t create Job.');
    }
  }

  return async.esc(create);
};


/**
 * @param {string} taskType
 * @param {!async.Step} handler
 * @param {number=} opt_concurrency
 * @param {number=} opt_limit
 * @return {!async.Step}
 */
service.queue.execute =
    function(taskType, handler, opt_concurrency, opt_limit) {

  /**
   * @param {!async.Input} input
   * @param {!async.CompleteHandler} complete
   * @param {!async.ErrorHandler} cancel
   */
  function execute(input, complete, cancel) {
    service.queue.__q.process(taskType, opt_concurrency || 1,
        function(job, done) {
          job.log('Job: ' + JSON.stringify(job));
          handler(job, function(result) {
            done();
          }, cancel);
        });

    if (typeof opt_limit !== 'undefined' &&
        typeof opt_concurrency !== 'undefined') {
      service.queue.__q.promote(1000, opt_concurrency || 1);
    }

    complete(input);
  }

  return async.esc(execute);
};


/**
 * @type {string}
 */
service.rest.HOST = '127.0.0.1';


/**
 * @type {number}
 */
service.rest.PORT = 19991;


/**
 * @param {string} data
 * @return {!Object}
 */
service.rest.__decodeFormData = function(data) {
  var result = {};
  var pairs = data.split('&');

  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    if (pair.length === 2) {
      result[pair[0]] = pair[1];
    }
  }

  return result;
};


/**
 * @param {!http.ServerRequest} request
 * @param {!http.ServerResponse} response
 */
service.rest.__handleRequest = function(request, response) {
  var postData = '';

  /**
   * @param {string} chunk
   */
  function handleData(chunk) {
    postData += chunk;
  }

  /**
   *
   */
  function handleClose() {
    var data = {};

    if (request.url === '/send') {

      if (request.headers['content-type'] ===
          'application/x-www-form-urlencoded') {
        data = service.rest.__decodeFormData(postData);

        if (typeof data['template'] === 'string') {
          service.rest.service(response, data['template']);
        } else {
          service.rest.sendErrorResponse(
              response, 'Invalid request data.', 400);
        }
      } else {
        service.rest.sendErrorResponse(
            response, 'Invalid request data.', 400);
      }
    } else {
      service.rest.sendErrorResponse(
          response, 'Unknown REST method.', 404);
    }

    request.removeAllListeners();
  }

  request.addListener('data', handleData);
  request.addListener('close', handleClose);
  request.addListener('end', handleClose);
};


/**
 * @param {!Error} error
 */
service.rest.__handleError = function(error) {
  console.error('Rest error.\n' + error.message);
};


/**
 * @param {!http.ServerResponse} response
 * @param {string} error
 * @param {number=} opt_code
 */
service.rest.sendErrorResponse = function(response, error, opt_code) {
  console.error(error);

  response.writeHead(opt_code || 500);
  response.end(error);
};


/**
 * @param {!http.ServerResponse} response
 * @param {string=} opt_result
 */
service.rest.sendSuccesResponse = function(response, opt_result) {
  console.log('Request successfully handled.');

  response.writeHead(200);
  response.end(opt_result || 'OK');
};


/**
 * @param {!Object} config
 */
service.rest.init = function(config) {
  service.rest.PORT = config.port || service.rest.PORT;
  service.rest.HOST = config.host || service.rest.HOST;

  console.log('Started listening at ' + service.rest.HOST + ':' +
      String(service.rest.PORT) + '.\n');

  var server = http.createServer();
  server.addListener('request', service.rest.__handleRequest);
  server.addListener('error', service.rest.__handleError);
  server.listen(service.rest.PORT, service.rest.HOST);
};


/**
 * @this {service.rest.service}
 *
 * @param {!http.ServerResponse} response
 * @param {string} template
 */
service.rest.service = function(response, template) {
  async.sequence([
    service.mongo.getDb(service.mongo.CONFIG),
    service.mongo.getCollection(service.mongo.Collection.PLAYERS),
    service.mongo.mapReduce(service.mapPlayers, service.reducePlayers,
        service.mongo.Collection.NOTIFICATIONS),
    service.mongo.getAll,

    async.proc.fold.parallel(
        service.createNotification('vk.sendNotification',
            template, service.TEMPLATE_TAG,
            service.MAX_ID_COUNT),
        async.input.ARRAY_ITERATOR, async.output.FLAT_COLLECTOR),

    async.proc.fold.parallel(
        service.queue.createJob(
            service.queue.ITEM_ATTEMPTS,
            service.queue.ITEM_LIMIT / service.queue.ITEM_CONCURRENCY),
        async.input.ARRAY_ITERATOR, async.output.NOP_COLLECTOR),

    service.queue.execute('notification', service.sendVkNotification,
        service.queue.ITEM_CONCURRENCY, service.queue.ITEM_LIMIT)
  ]).call(this, null, function() {
    service.rest.sendSuccesResponse(response);
  }, function(error, opt_code) {
    service.rest.sendErrorResponse(response, error, opt_code);
  });
};


/**
 * @param {!Object} config
 */
service.init = function(config) {

  if (config &&
      typeof config['queue'] !== 'undefined' &&
      typeof config['mongodb'] !== 'undefined' &&
      typeof config['rest'] !== 'undefined' &&
      typeof config['vk'] !== 'undefined'
  ) {
    service.rest.init(config['rest']);
    service.queue.init(config['queue']);
    service.mongo.init(config['mongodb']);
    vk.registerDestination(config['vk']);

    service.MAX_ID_COUNT = config.id_limit || service.MAX_ID_COUNT;
    service.TEMPLATE_TAG = config.template_tag || service.TEMPLATE_TAG;
  } else {
    console.error('Invalid config. [' + JSON.stringify(config) + ']');
  }
};


service.init(config);

module.exports = async;

