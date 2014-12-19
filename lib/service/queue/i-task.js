


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
