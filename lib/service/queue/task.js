


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
