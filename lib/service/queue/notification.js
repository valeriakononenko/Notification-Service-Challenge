


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
