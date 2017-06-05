var Sequelize = require('sequelize');
var cls = require('continuation-local-storage'); // For automatic transactions (see http://docs.sequelizejs.com/en/latest/docs/transactions/) 
Sequelize.cls = cls.createNamespace('sequelize-transaction-namespace');

var config = require('../config.json'); 
var lodash = require('lodash');
var debug = require('debug')('traction:db');
var fs = require('fs');
var path = require('path');



module.exports = function(app) {

	app.db = {};
	app.db.models = {}; 
	app.db.Sequelize = Sequelize;
	app.db.connection = new Sequelize(config.db.name, config.db.user, config.db.password, {
		dialect: 'mariadb',
		pool: {
			max: 5,
			min: 0,
			idle: 10000
		},
		logging: console.log,
		native: true, 
	});
	app.db.connection.app = app; 

	app.db.connection.authenticate().then(function(err) {

	}).catch(function(error){
		
		console.error("Unable to connect: " + error);
	});


	fs.readdirSync(__dirname+"/../models").filter(function(file) {	
		return (file.charAt(0) != '.' &&  file.indexOf('.js') != -1) && (file.indexOf('.swp') == -1)
	}).forEach(function(file){
		var model = app.db.connection.import(__dirname+"/../models/"+file);	
		app.db.models[model.name] = model
	})

	debug("Initializing models");
	Object.keys(app.db.models).forEach(function(modelName) {

		if ('associate' in app.db.models[modelName]) {
			console.log("Associating model: " + modelName);
			app.db.models[modelName].associate(app.db.models)
		}
	})


}
