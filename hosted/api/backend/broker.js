var mqtt    = require('mqtt');
var config = require('../config.json');
var debug = require('debug')('traction:broker');



module.exports = function(app) {
	app.broker = {};

	var connectUri = 'mqtt://'+config.broker.host+":"+config.broker.port;
	app.broker.connection  = mqtt.connect(connectUri, {keepalive: 30, clientId: config.broker.clientId, reconnectPeriod: 1000, username: config.broker.user, password: config.broker.password});

	app.broker.connection.on('connect', function () {
		debug("connection established");
	});

	app.broker.connection.on('message', function (topic, message) {

	});
}

