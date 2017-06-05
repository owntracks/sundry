var crypto = require('crypto');
var config = require('../config.json')
var util = require('util')
var base32 = require('base32')
var _ =require('underscore');

module.exports = function (sequelize, DataTypes) {
	var app = sequelize.app; 

	var Device = sequelize.define('Device', 
		{
			devicename : {
				type : DataTypes.STRING,
				allowNull : false,
				unique: 'userId_devicename_unique'
			},
			userId: {
				type: DataTypes.INTEGER, 
				unique: 'userId_devicename_unique'
			},
			accessToken : DataTypes.STRING,
		}, {			 
			hooks: {
				afterCreate: function(instance, options, fn){
					//app.statsd.increment("devices");
		                        app.slack.sendDeviceCreationNotification(instance);

					return instance.getUser().then(function(user){
					
						if(user)
							return instance.updateFace(user);
						return;
					}).finally(function(error){
						fn(null, instance);
					})
				},
				afterDestroy: function(instance, options, fn){
					fn(null, instance); 
				}

			},	
			instanceMethods : {
				resetToken : function (user) {
					var token = Device.generateToken();
                                        token.deviceId= this.id;
                                        token.userId =this.userId;

					return this.updateAttributes({
						accessToken : token.pbkdf2
					}).then(function (device) {
						device.token = token;
						return device;
					});
				},

				updateFace : function (user) {
					var face = {
						"_type" : "card",
					};
					if(!_.isEmpty(user.fullname)) {
						face['name'] = user.fullname
					}
					if(!_.isEmpty(user.photo)) {
						face['face'] = user.photo;						
					}
					
					return app.broker.connection.publish(this.getFaceTopic(user), JSON.stringify(face), {
						qos : 0,
						retain : true
					});
				},

				clearFace : function (user) {
					return app.broker.connection.publish(this.getFaceTopic(user), "", {
						qos : 0,
						retain : true
					});
				},
				getTopic : function (user) {
					return user.getTopic()+ "/" + this.devicename;
				},
				getROTopic : function (user) {
					return this.getTopic(user)+ "/#";
				},
				getRWTopic : function (user) {
					return this.getTopic(user)+ "/#";
				},

				getFaceTopic : function (user) {
					return this.getTopic(user) + "/info";
				},
				getLogin : function (user) {
					return user.getUsername() + "|" + this.devicename;
				},
				getOtrcPayload: function(user, token) {
					return {"_type":"configuration", "username":user.username, "mode":1, "deviceId": this.devicename,"password": token.plain}
				}

			},
			classMethods : {

				associate: function(models){
					Device.belongsTo(models.User, {foreignKey: "userId"});
					Device.hasMany(models.Share, {foreignKey: 'trackedDeviceId', onDelete: 'cascade'});
				},
				generateToken : function (user) {
					var self = this; 
					var accessToken = base32.encode(crypto.randomBytes(8));
					
					
					var accessTokenHashSalt = crypto.randomBytes(config.passwordOptions.saltLength);
					var accessTokenHashSaltB64 = accessTokenHashSalt.toString('base64');

					var accessTokenHash = crypto.pbkdf2Sync(accessToken, accessTokenHashSaltB64, config.passwordOptions.rounds, config.passwordOptions.keyLength, config.passwordOptions.algorithm)
						var accessTokenHashB64 = new Buffer(accessTokenHash, 'binary').toString('base64')
						var pbkdf2 = util.format("PBKDF2$%s$%d$%s$%s", config.passwordOptions.algorithm, config.passwordOptions.rounds, accessTokenHashSaltB64, accessTokenHashB64)

						return {
						plain : accessToken,
						pbkdf2 : pbkdf2
						}
				}
			}
		}
	);
	return Device; 
}

