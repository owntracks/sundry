var debug = require('debug')('traction:server');
var config = require('./config.json')
var http = require('http');
var express = require('express');
var router = express.Router();
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');
var errorHandler = require('express-error-middleware');
var requestPromise = require('request-promise')
var request = require('request')
var validator = require('validator'); 
validator.extend('isWhitespace', function (str) {
    return /^\s+$/.test(str);
});


var crypto = require('crypto');
var session = require('express-session');
var flash = require('connect-flash');
var mqtt = require('mqtt');
var util = require('util');
var _ =require('underscore');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false}));
require('./backend/logger.js')(app);
require('./backend/db.js')(app);
require('./backend/broker.js')(app);
require('./backend/mailer.js')(app);
require('./backend/slack.js')(app);
console.log = app.log;
console.error = app.logError

app.slack.sendAppStartedNotification(); 


resError = function(res, message, status) {
  app.logError("resError: " + message + " ("+status +")");
  res.type('application/json'); 
  res.status(status || 500);
  return res.json({status: (status || 500), 'error': (message || "internal server error")})
}

resData = function(res, data, status) {
  res.type('application/json'); 
  res.status(status || 200);
  return res.json({status: status || 200, data: data})
}

resAccessDenied = function(res) {
  return resError(res, "access denied", 401);
}

resBadRequest = function(res) {
  return resError(res, "bad request", 400);
}

function HttpError(message, code) {
    this.code = code;
    this.message = message;
    this.name = "HttpError";
}
HttpError.prototype = Error.prototype;

getToken = function(req) {
	if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
		return req.headers.authorization.split(' ')[1];
	} else if (req.query && req.query.token) {
		return req.query.token;
	}
	return null;
}

requireAuth = function() {
	return expressJwt({secret: config.session.jwtAccessSecret, requestProperty: 'jwt', credentialsRequired: true ,getToken: getToken}); 
}

signAccessToken = function(user, decodedRefreshToken){
	return jwt.sign({
		refreshTokenId: decodedRefreshToken.id,
		userId: user.id,
		isAdmin: user.isAdmin(),
		username: user.username
	}, config.session.jwtAccessSecret, {expiresIn: 7200})
}

signRefreshToken = function(user, session) {
	return jwt.sign({
		username: user.username,
		userId: user.id,
		email: user.email,
		sessionId: session.id,
		isAdmin: user.isAdmin(),
		secret: session.secret
	}, config.session.jwtRefreshSecret, {})
}

console.log = app.log;
console.error = app.logError 

app.post('/api/v1/users', function (req, res, next) {
	var username = req.body.username;
	var fullname = req.body.fullname;
	var email = req.body.email;
	var password = req.body.password;
	console.log(username);
	console.log(fullname);
	console.log(email);
	console.log(password);

	if (validator.isNull(username) || validator.isNull(password) || validator.isNull(email) || validator.isNull(fullname)) {
		return resError(res, "a required attribute was missing", 400);
	}

        if (validator.isWhitespace(username) || validator.isWhitespace(password) || validator.isWhitespace(email) || validator.isWhitespace(fullname)) {
                return resError(res, "a required attribute may not be blank", 400);
        }

        if(!validator.isAlphanumeric(username)) {
	        return resError(res, "username may only contain alphanumeric characters", 401);
	}

	if(!validator.isEmail(email)) {
	        return resError(res, "email is invalid", 400);
	}

	console.log("new usename: " + username);	

	//fullname = validator.stripLow(username, false);
	fullname = validator.trim(fullname);


	return app.db.models.User.create({
		username : username,
		email : email,
		password : password,
		fullname: fullname
	}).then(function(u){
		return resData(res, {id: u.id, username: u.username, fullname: u.fullname, email: u.email, photo: u.photo, createdAt: u.createdAt, updatedAt: u.updatedAt}, 201); 
	}).catch (next);
});


app.post('/api/v1/authenticate/refresh', function(req, res, next) {
	var refreshToken = getToken(req); 
        console.log("returned token was: " + refreshToken); 
        if(!refreshToken ) {
 		return resError(res, "request did not contain a valid refresh token", 400);
 	}


	jwt.verify(refreshToken, config.session.jwtRefreshSecret, function(err, decodedRefreshToken) {
                if(err) {
			pp.logError(err);
			return resError(res, "invalid refresh token", 401)
  		}
		console.log(decodedRefreshToken);
		return app.db.models.Session.findOne({where: {id: decodedRefreshToken.sessionId, secret: decodedRefreshToken.secret}}).then(function(token) {
			if(!token) {
				app.logError("token not found in db"); 
				throw new HttpError("the provided token has been revoked",401)
			}		

			return token.updateAttributes({updatedAt: new Date()})
		}).then(function(){
			return app.db.models.User.findById(decodedRefreshToken.userId);
		}).then(function(user) {
			if(!user){
				console.log("token user not found in db"); 
				throw new Error("the provided token has been revoked",401)
			}
			return resData(res, {accessToken: signAccessToken(user, decodedRefreshToken)});
		}).catch(next);
        });
})

app.post('/api/v1/authenticate', function(req, res, next) {
	if(!req.body.username || !req.body.password)
		return resBadRequest(res);


	
	var clientType = req.body.clientType; 
	console.log("clientType: "+ clientType);
	if(clientType != "mobile" && clientType != "web") {
		clientType = "generic"; 
	}

	console.log("clientType: "+ clientType);
	console.log("local authentication for user: " + req.body.username); 
	
        return app.db.models.User.findByUsername(req.body.username).then(function (user) {
		if(!user)
			throw new HttpError("invalid username or password", 422)

		console.log("user found");
		if(user.authenticate(req.body.password)) {
                        var secret = crypto.randomBytes(24).toString('hex');

			return app.db.models.Session.create({userId: user.id, secret: secret, type: clientType}).then(function(session) {
                		return resData(res, {"refreshToken": signRefreshToken(user, session)});
			})
		} else {
			throw new HttpError("invalid username or password", 422)	
		}

	}).catch(next);
});

app.get('/api/v1/users', requireAuth(), function(req, res) {
  if(!req.jwt.isAdmin)
    return resAccessDenied(res)

  return app.db.models.User.findAll({where: {not: {id: 1}}, attributes: ["id", "username", "fullname", "createdAt"], order: 'id DESC', raw: true}).then(function(users) {
      resData(res, users, 200);
  });
})

app.get('/api/v1/users/:userId', requireAuth(), function(req, res) {
  if(!req.params.userId)
    return resBadRequest(res);


  if(req.jwt.userId != req.params.userId && !req.jwt.isAdmin)
    return resAccessDenied(res);

  return app.db.models.User.findOne({where: {id: req.params.userId}, attributes: ["id", "username", "fullname", "email", "photo", "createdAt"], raw: true}).then(function(user) {
    if(!user)
      return resError(res, "not found", 404);

    return resData(res, user);
  });
})


function search(nameKey, myArray){
    for (var i=0; i < myArray.length; i++) {
        if (myArray[i].name === nameKey) {
            return myArray[i];
        }
    }
}

app.get('/api/v1/users/:userId/devices', requireAuth(), function(req, res) {
  if(!req.params.userId)
    return resBadRequest(res);


  if(req.jwt.userId != req.params.userId && !req.jwt.isAdmin)
    return resAccessDenied(res);

  var username; 

  return app.db.models.User.findOne({where: {id: req.params.userId}, attributes: ["username"], raw: true}).then(function(userData) {
   	username = userData.username; 
  	return app.db.models.Device.findAll({where: {userId: req.params.userId}, attributes: ["id", "devicename", "userId", "createdAt", "updatedAt"], raw: true});
  }).then(function(devices) {
	if(!req.query.last)
		return resData(res, devices);

  	return requestPromise.get({
                uri: config.recorder.endpointLast,
                qs:{ 'user': username, fields: 'device,tst,disptst,batt,tid,cc,addr'},
                json: true
        }).then(function(lastRecorderData) {
		var i;
		for (i = 0; i < devices.length; ++i) {
        		var last = _.findWhere(lastRecorderData, {device: devices[i].devicename});
				if(last) {
        			devices[i].tst = last.tst;
        			devices[i].disptst = last.disptst;
        			devices[i].batt = last.batt;
        			devices[i].tid = last.tid;
        			devices[i].addr = last.addr;
			}
   		}
    		return resData(res, devices);
	});

  });
})

app.get('/api/v1/users/:userId/devices/:deviceId', requireAuth(), function(req, res) {
  if(!req.params.userId || !req.params.deviceId)
    return resBadRequest(res);


  if(req.jwt.userId != req.params.userId && !req.jwt.isAdmin)
    return resAccessDenied(res);



  return app.db.models.Device.findOne({where: {userId: req.params.userId, id: req.params.deviceId}, attributes: ["id", "devicename", "userId", "createdAt", "updatedAt"], raw: true}).then(function(device) {
    return resData(res, device);
  });
})

app.get('/api/v1/users/:userId/devices/:deviceId/history/export', requireAuth(), function(req, res) {
  if(!req.params.userId || !req.params.deviceId)
    return resBadRequest(res);

  if(req.jwt.userId != req.params.userId && !req.jwt.isAdmin)
    return resAccessDenied(res);

  return app.db.models.User.findOne({where: {id: req.params.userId}, attributes: ["username"], include: { model: app.db.models.Device, where: {id: req.params.deviceId}, attributes: ["devicename"] }, raw: true}).then(function(data) {
 	var qs = { 'device': data["Devices.devicename"], 'user': data["username"], 'from': req.query.from, 'to': req.query.to};
        if(req.query.format == 'csv') {
                res.set('Content-Type', 'text/csv');
                qs.format = req.query.format;
        } else if(req.query.format == 'geojson') {
                res.set('Content-Type', 'application/vnd.geo+json');
                qs.format = req.query.format;
        } else if(req.query.format == 'gpx') {
                res.set('Content-Type', 'application/vnd.geo+json');
                qs.format = req.query.format;
        } else {
                res.set('Content-Type', 'application/json');
                qs.format = 'json';
	}
        res.setHeader('Content-disposition', 'attachment; filename=export_'+data["username"]+"_"+data["Devices.devicename"]+'.'+req.query.format);
        return request({uri: config.recorder.endpointLocations, qs: qs, method: 'GET'}).pipe(res);
  });

})


app.get('/api/v1/users/:userId/devices/:deviceId/history', requireAuth(), function(req, res) {
  if(!req.params.userId || !req.params.deviceId)
    return resBadRequest(res);

  if(req.jwt.userId != req.params.userId && !req.jwt.isAdmin)
    return resAccessDenied(res);

  return app.db.models.User.findOne({where: {id: req.params.userId}, attributes: ["username"], include: { model: app.db.models.Device, where: {id: req.params.deviceId}, attributes: ["devicename"] }, raw: true}).then(function(data) {

  	var qs = { 'device': data["Devices.devicename"], 'user': data["username"], 'limit': req.query.limit, 'from': req.query.from, 'to': req.query.to, fields: 'tst,acc,batt,tid,cc,addr,disptst,lat,lon'};
   	return request({uri: config.recorder.endpointLocations, qs: qs, method: 'GET'}).pipe(res);
  });
});

app.post('/api/v1/users/:userId/devices', requireAuth(), function(req, res, next) {
        if (!req.params.userId || _.isEmpty(req.body.devicename)) {
    		return resBadRequest(res);
	}

        var devicename = req.body.devicename;

        if(devicename.match(/[^A-Za-z0-9]/)) {
                return resError(res, "the devicename may only contain alphanumeric characters", 401);
        }

        app.db.connection.transaction(function (t) {
		var token = app.db.models.Device.generateToken();
		var d = {}; 
  		var user; 
		return app.db.models.User.findOne({where: {id: req.params.userId}, attributes: ["id", "username" ]}).then(function(u) {
    			if(!u)
				throw new HttpError("the user could not be found", 404);
		
			user = u; 
			return app.db.models.Device.create({
                		devicename : devicename,
                        	userId : user.id,
                        	accessToken : token.pbkdf2})
		}).then(function (device) {
			d.accessToken = token.plain;
			d.id= device.id;
			d.userId = user.userId;
			d.devicename = device.devicename;
			d.createdAt = device.createdAt;
			d.updatedAt = device.updatedAt;

			return app.db.models.Permission.create({
				userId: user.id, 
				username: user.username, 
				deviceId: device.id, 
				shareId: null, 
				topic: device.getRWTopic(user), 
				rw: "2"});
                 }).then(function(){
			return d; 
                 })
        }).then(function(device) {
		return resData(res, device, 201);
	}).catch (next)
})



app.put('/api/v1/users/:userId/devices/:deviceId', requireAuth(), function(req, res) {
        if (!req.params.userId || !req.params.deviceId) {
                return resBadRequest(res);
        }


        return app.db.connection.transaction(function (t) {
                var token = app.db.models.Device.generateToken();
                var d = {};

		return app.db.models.Device.findOne({where: {id: req.params.deviceId, userId: req.params.userId}}).then(function (device) {
                       if (!device) {
                      		throw new Error("device not be found");
                       }

			d.accessToken = token.plain;
                        d.id= device.id;
                        d.userId = device.userId;
                        d.devicename = device.devicename;
                        d.createdAt = device.createdAt;
                        d.createdAt = device.createdAt;

                	return device.updateAttributes({accessToken: token.pbkdf2});
		})
        }).then(function (device) {
                d.updatedAt = device.updatedAt;
		return resData(res, d);
        }).catch (function (error) {
                app.logError(error);
                return resError(res, "device credentials could not be updated", 500);
        })

})


app.get('/api/v1/users/:userId/shares', requireAuth(),function (req, res,next) {
  if(!req.params.userId || !(req.params.userId == req.jwt.userId || req.jwt.isAdmin) ) {
        return resAccessDenied(res)
  }


  var trackedUserId = req.params.userId;
  var trackingUserId = req.params.userId;
  if(req.query.direction && req.query.direction === 'to') {
	trackedUserId = 0;
  } else if(req.query.direction && req.query.direction === 'from') {
	trackingUserId = 0;
  } 



  return app.db.connection.query("SELECT S.id, S.accepted, S.createdAt, S.trackedDeviceDevicename as fromDeviceDevicename, S.trackedDeviceId as fromDeviceId, TU.id as toUserId, TU.username as toUserUsername, TU.fullName as toUserFullname, FU.id as fromUserId, FU.username as fromUserUsername, FU.fullName as fromUserFullname from Shares as S join Users as TU on S.trackingUserId = TU.id join Users as FU on S.trackedUserId = FU.id  where S.trackedUserId = :trackedUserId OR S.trackingUserId= :trackingUserId",{ replacements: { trackedUserId: trackedUserId, trackingUserId: trackingUserId }, type: app.db.Sequelize.QueryTypes.SELECT })
  .map(function(data) {
    return {id: data.id, accepted: data.accepted == 1, createdAt: data.createdAt, from: {id: data.fromUserId, username: data.fromUserUsername, fullname: data.fromUserFullname, device: {id: data.fromDeviceId, devicename: data.fromDeviceDevicename}}, to: {id: data.toUserId, username: data.toUserUsername, fullname: data.toUserFullname}};
  }).then(function(shares) {
    return resData(res, shares);
  }).catch(next);
})


app.get('/api/v1/users/:userId/trackers', requireAuth(),function (req, res) {
  if(!req.params.userId || !(req.params.userId == req.jwt.userId || req.jwt.isAdmin) ) {
	return resAccessDenied(res)
  }
  return app.db.connection.query("SELECT S.id, S.accepted, S.createdAt, S.trackedDeviceDevicename, S.trackedDeviceId, U.username, U.fullName, U.photo from Shares as S join Users as U on S.trackingUserId = U.id where S.trackedUserId = :userId", { replacements: { userId: req.params.userId }, type: app.db.Sequelize.QueryTypes.SELECT }) 
  .then(function(data) {
  }).catch(function(error) {
    console.error(error);
    return resError(res, error);
  });
})

app.post('/api/v1/users/:userId/trackers', requireAuth(), function(req, res, next) {
	if (!req.params.userId ||!(req.params.userId = req.jwt.userId)) {
		return resAccessDenied(res)
	}


	if( _.isEmpty(req.body.username) || _.isEmpty(req.body.deviceId)) {
                return resBadRequest(res);
        }
	
	var toUser; 
	var fromUser; 
        var fromDevice;

	return app.db.connection.transaction(function (t) {

        	return app.db.models.User.findById(req.params.userId).then(function(u) {
	                fromUser = u;
                        if(!fromUser) {
                                throw new HttpError("unable to find a user with the specified username", 404);
                        }

			return app.db.models.Device.findOne({where: {id: req.body.deviceId, userId: req.params.userId}});
		}).then(function (d) {
			fromDevice = d;

			if (!fromDevice) {
				throw new HttpError("unable to find a device with the specified id", 404);
			}

			return app.db.models.User.findOne({where: {username: req.body.username}});

		}).then(function(t){
			toUser = t;

			if(!toUser) {
				throw new HttpError("unable to find a user with the specified username", 404);
			}

			return app.db.models.Share.find({where: {trackedUserId: fromUser.id, trackedDeviceId: fromDevice.id, trackingUserId: toUser.id}})
		}).then(function(share){
			if(share) {
				throw new HttpError("the specified tracking already exists", 409);
			}

			return fromUser.addShare(fromDevice, toUser);
		})
	}).then(function(share){
		app.logAction("user " + req.params.userId + " added share " + share.id + " ["+ share.trackedDeviceDevicename+"->"+ toUser.usernamei+ "]");
		return resData(res, {id: share.id, accepted: share.accepted, trackedDeviceDevicename: share.trackedDeviceDevicename, trackedDeviceId: share.trackedDeviceId, username: toUser.username, fullName: toUser.fullName, photo: toUser.photo})
	}).catch(next);

})


app.delete('/api/v1/users/:userId/shares/:shareId', requireAuth(), function(req, res, next) {
        if (!req.params.userId || !req.params.shareId) {
                return resBadRequest(res);
        }


        if (req.params.userId != req.jwt.userId) {
                return resAccessDenied(res)
        }

	return app.db.connection.transaction(function (t) {

		return app.db.models.Share.findOne({where: {id: req.params.shareId, $or: [{trackingUserId: req.params.userId}, {trackedUserId: req.params.userId}]}}).then(function(s){
			share = s; 

			if (!share || !(share.trackedUserId == req.params.userId || share.trackingUserId == req.params.userId))
				throw new HttpError("The object could not be found", 404);

			return share.destroy();
		})
	}).then(function(){
		app.logAction("user " + req.params.userId + " removed share " + req.params.shareId);
		return resData(res, {code: 200, message: "share removed"}); 
	}).catch(next);
})


app.get('/api/v1/users/:userId/trackings', requireAuth(), function (req, res) {
  if(!req.params.userId || !(req.params.userId == req.jwt.userId || req.jwt.isAdmin) ) {
    return resError(res, "user not found");
  }

  return app.db.connection.query("SELECT S.id, S.accepted, S.createdAt, S.trackedDeviceDevicename, S.trackedDeviceId, U.username, U.fullName, U.photo from Shares as S join Users as U on S.trackedUserId = U.id where S.trackingUserId = :userId", { replacements: { userId: req.params.userId }, type: app.db.Sequelize.QueryTypes.SELECT })
  .then(function(data) {
    return resData(res, data);
  }).catch(function(error) {
    console.error(error);
    return resError(res, error);
  });


})

app.get('/api/v1/users/:userId', requireAuth(), function (req, res, next) {

  if(!req.params.userId || !(req.params.userId == req.jwt.userId || req.jwt.isAdmin) ) {
    return resError(res, "user not found");
  }

  return app.db.models.User.findById(req.params.userId).then(function(u) {
    if(!user)
    	throw new HttpError("user not found", 404);
    return resData(res, user);
  }).catch(next);
});


app.post('/api/v1/users/:userId', requireAuth(), function (req, res, next) {
	if(!req.params.userId || !(req.params.userId == req.jwt.userId || req.jwt.isAdmin) ) {
		return resError(res, "user not found", 404);
	}

        var fullname = req.body.fullname;
        var email = req.body.email;
        var password = req.body.password;
        var newPassword = req.body.newPassword;
        console.log(fullname);
        console.log(email);
        console.log(password);
        console.log(newPassword);

	return app.db.models.User.findById(req.params.userId).then(function(user) {
		var attributes = {};
 	       	if (validator.isNull(password) || validator.isWhitespace(password) || !user.authenticate(password)) {
     			return resError(res, "the provided current password is invalid", 401);
       		}

        	if(!validator.isNull(newPassword) && !validator.isWhitespace(newPassword)) {
                	attributes['password']=newPassword;
        	}

        	if(!validator.isNull(fullname) && !validator.isWhitespace(fullname)) {
                	attributes['fullname']=fullname;
        	}

        	fullname = validator.trim(fullname);
        	if(!validator.isNull(email) && !validator.isWhitespace(email) && validator.isEmail(email)) {
                	if(!validator.isEmail(email)) {
                        	return resError(res, "the provided email address is invalid", 400);
                	}
                	attributes['email']=email;
        	}

		console.log(attributes);
       		return user.update(attributes, {where: {id: req.params.userId}, fields: Object.keys(attributes), validate: true, limit: 1}).then(function(u){
                	return resData(res, {id: u.id, username: u.username, fullname: u.fullname, email: u.email, photo: u.photo, createdAt: u.createdAt, updatedAt: u.updated});
		});
	
        }).catch (next);
	
});


app.get('/api/v1/users/:userId/sessions', requireAuth(), function(req, res, next) {
  if(!req.params.userId)
    return resBadRequest(res);


  if(req.jwt.userId != req.params.userId && !req.jwt.isAdmin)
    return resAccessDenied(res);

  app.db.models.Session.findAll({where: {userId: req.params.userId}, attributes: ['id', 'type', 'createdAt', 'updatedAt']}).then(function(tokens){
	return resData(res, tokens); 
  }).catch(next); 

})



//app.use(errorHandler.NotFoundMiddleware); // if a request is not handled before this a NotFoundError will be sent into next 

app.all("*", function (req, res, next) {
    next(new HttpError("api endpoint not found", "404"));
});


app.use(function (err, req, res, next) {
  if(err.name === 'HttpError')
    return resError(res, err.message, err.code);

  if(err.name === 'UnauthorizedError')
    return resError(res, 'access token has expired', 403)

  if(err.name === 'SequelizeUniqueConstraintError')
    return resError(res, 'already exists', 409)
  
  app.logError(err);
  return resError(res); 
});



// Setup and run server
var port = normalizePort(config.port || '3000');
app.set('port', port);
var server = http.createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = typeof port === 'string'
		 ? 'Pipe ' + port
		 : 'Port ' + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
	case 'EACCES':
		app.logger.default.error(bind + ' requires elevated privileges');
		process.exit(1);
		break;
	case 'EADDRINUSE':
		app.logger.default.error(bind + ' is already in use');
		process.exit(1);
		break;
	default:
		throw error;
	}
}

function onListening() {
	var addr = server.address();
	var bind = typeof addr === 'string'
		 ? 'pipe ' + addr
		 : 'port ' + addr.port;
	app.log('Listening on ' + bind);
}
