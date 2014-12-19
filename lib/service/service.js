

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
