

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
