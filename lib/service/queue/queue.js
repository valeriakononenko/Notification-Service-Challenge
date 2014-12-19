

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
