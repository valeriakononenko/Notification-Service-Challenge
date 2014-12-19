

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
