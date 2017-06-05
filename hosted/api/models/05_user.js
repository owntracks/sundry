var crypto = require('crypto');
var config = require('../config.json')
var util = require('util')
var jwt = require('jsonwebtoken');

var request = require('request-promise').defaults({
		encoding : null
});

module.exports = function (sequelize, DataTypes) {
	var app = sequelize.app; 


	var User = sequelize.define('User', 
		{
			username : {
				type : DataTypes.STRING,
				unique : true,
				allowNull : false
			},
			fullname : {
				type : DataTypes.STRING
			},
			email : {
				type : DataTypes.STRING,
				unique : true,
				allowNull : false
			},
			photo : DataTypes.TEXT,
			password : {
				type : DataTypes.STRING,
				allowNull : false,
				set : function (v) {

					var salt = crypto.randomBytes(config.passwordOptions.saltLength);
					var saltB64 = salt.toString('base64');

					var passwordHash = crypto.pbkdf2Sync(v, saltB64, config.passwordOptions.rounds, config.passwordOptions.keyLength)
						var passwordHashB64 = new Buffer(passwordHash, 'binary').toString('base64')
						var pbkdf2 = util.format("PBKDF2$%s$%d$%s$%s", config.passwordOptions.algorithm, config.passwordOptions.rounds, saltB64, passwordHashB64)

						this.setDataValue('password', pbkdf2);
						
				}
			},
		  passwordResetToken: {type: DataTypes.STRING, allowNull: true, default: null},
		  passwordResetTokenExpires: {type: DataTypes.DATE, allowNull: true, default: null},
			disabled : {
				type : DataTypes.BOOLEAN,
				defaultValue : false,
				allowNull : false
			}, 
		}, {
			hooks: {
        afterCreate: function(instance, options, fn){
          app.mailer.sendRegisterNotification(instance, function(error, responseStatusMessage, html, text){
          	return instance.updateFace().then(function(){
			app.slack.sendAccountCreationNotification(instance);
          		fn();
          	}); 
          });
        },
        afterDestroy: function(instance, options, fn){
        		fn();
        },
	afterUpdate: function(instance, options, fn) {
		if (instance.changed('password')) {
			return app.db.models.Session.destroy({where: {userId: instance.id}}).then(function(){
				fn(); 
			}) 
		} else {
			fn(); 
		}

	}


      },
			classMethods : {
				associate: function(models){
					User.hasMany(models.Device, {foreignKey: "userId", onDelete: 'cascade'})
					User.hasMany(models.Session, {foreignKey: "userId", onDelete: 'cascade'})

					//User.hasMany(models.User, {as: "trackedUsers", foreignKey: 'trackingUserId', otherKey: "trackedUserId", through: models.Share})
					User.belongsToMany(models.User, {as: "trackedUsers", foreignKey: 'trackingUserId', otherKey: "trackedUserId", through: models.Share})
					User.belongsToMany(models.User, {as: "trackingUsers", foreignKey: 'trackedUserId', otherKey: "trackingUserId", through: models.Share})
	
				},
				findByUsername : function (username) {
					return User.find({
						where : {
							username : username
						}
					});
				}, 
			},
			instanceMethods : {
				isAdmin: function() {
					return config.admins.indexOf(this.id) != -1; 
				},
				// Resolves Gravatar and saves base64 encoded image to user instance
				updateFace : function () {
					var self = this;
					return this.resolveGravatar().then(function (image) {
						return self.updateAttributes({
							photo : image
						});
					}).then(function () {
						return self;
					});
				},

				// For subsequent device syncs. Gets new face and updates all devices
				updateFaceAndDevices : function () {
					var self = this;
					return this.updateFace().then(function () {
						return self.updateDeviceFaces();
					})
				},

				// Updates face of all devices
				updateDeviceFaces : function () {
					var self = this;

					return this.getDevices().each(function (device) {
						device.updateFace(self);
					})
				},
				clearDeviceFaces : function () {
					return this.getDevices().each(function (device) {
						device.clearDeviceFace(self);
					})
				},

				getTopic: function() {
					return config.broker.prefix + "/" + this.getUsername();
				},



				getUsername : function () {
					return this.username;
				},

				authenticate : function (password) {
					console.log("authenticating user with password: " + password);
 					if(this.disabled)
						return false;//return done("Your account is suspended. Please contact our support.", false);

					var pbkdf2 = this.password.split("$");

					//"PBKDF2$%s$%d$%s$%s", config.passwordOptions.algorithm, config.passwordOptions.rounds, saltB64, passwordHashB64)""
					//  0                    1                          2                       3        4
					var hashRaw = crypto.pbkdf2Sync(password, pbkdf2[3], parseInt(pbkdf2[2]), config.passwordOptions.keyLength);
					if (!hashRaw)
						return false; //return done("empty hash", false);
					console.log("hashraw ok");

					if (new Buffer(hashRaw, 'binary').toString('base64') === pbkdf2[4]) {
						console.log("auth ok");
						return true; //return done(null, this);
					} else {
						console.log("auth mismatch");
						return false; //return done("incorrect password", false);
					}
				},
				resolveGravatar : function () {
					var queryUrl = 'http://www.gravatar.com/avatar/' + crypto.createHash('md5').update(this.email.toLowerCase().trim()).digest('hex') + "?d=mm&s=40";

					return request({
						method : "GET",
						uri : queryUrl,
						resolveWithFullResponse : true
					}).then(function (response) {
						if (response.statusCode != 200)
							return null;
						return new Buffer(response.body, 'binary').toString('base64');
					}).catch (function (error) {
						app.logger.error(error);
					})
				},

				addShare: function(device, toUser) {
					var self = this;
					var share; 


					return app.db.models.Share.create({trackingUserId: toUser.id, trackedDeviceDevicename: device.devicename,  accepted: false, trackedUserId: self.id, trackedDeviceId: device.id}).then(function(s){
						share = s; 
						return app.db.models.Permission.create({userId: self.id, username: self.username, deviceId: device.id, shareId: share.id, topic: device.getROTopic(self), rw: "1"});
					}).then(function(permission){
						// send mail async
						app.mailer.sendNewTrackingUserNotification({user: toUser, otherUser: self, otherUserDevice: device, permission: permission});
						return share;
					});
				},

				addDev : function (name) {
					var token = app.db.models.Device.generateToken();
					var self = this;
					var newDevice; 

					return app.db.models.Device.create({
						devicename : name,
						userId : self.id,
						accessToken : token.pbkdf2
					}).then(function (device) {

						token.deviceId= device.id;
                                                token.userId =device.userId;
                                                device.token = token; // Token is temporarily stored in the instance so it can be shown to the user once or downloaded. Contains pbkdf2, plain userId and deviceId. The plain token is never stored in the database^M
						newDevice = device; 

						return app.db.models.Permission.create({userId: self.id, username: self.username, deviceId: newDevice.id, shareId: null, topic: newDevice.getRWTopic(self), rw: "2"});


					}).then(function(){
						return newDevice; 
					})
				},
			}
		}
	);
	return User;
}
