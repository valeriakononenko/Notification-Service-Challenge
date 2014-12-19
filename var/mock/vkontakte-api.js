

var http = require('http');


/**
 * @namespace
 */
var vk = {};


/**
 * @typedef {{hostname: string, port: number}}
 */
vk.Destination;


/**
 * @type {vk.Destination}
 */
vk.__destination = {
	'hostname': 'localhost',
	'port': 8088
};


/**
 * @param {vk.Destination} destination
 */
vk.registerDestination = function(destination) {
	vk.__destination = destination;
};


/**
 * @param {!Object} data
 * @param {function(*)} complete
 * @param {function(!Error, number=)} cancel
 */
vk.__post = function(data, complete, cancel) {
	var postData = JSON.stringify(data);
	var options = {
		path: '/',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': postData.length
		}
	};

	options.hostname = vk.__destination.host;
	options.port = vk.__destination.port;

	var req = http.request(options, function(res) {
		res.on('data', complete);
	});

	//req.on('error', cancel);
	req.on('error', complete);

	req.write(postData);
	req.end();
};


/**
 * @param {string} ids
 * @param {string} text
 * @param {function(?Error, *)} callback
 */
vk.sendNotification = function(ids, text, callback) {
	var data = {
		'ids': ids,
		'text': text
	};

	/**
	 * @param {*} result
	 */
	function complete(result) {
		callback(null, result);
	}

	/**
	 * @param {!Error} error
	 */
	function cancel(error) {
		callback(error, null);
	}

	vk.__post(data, complete, cancel);
};


module.exports = vk;