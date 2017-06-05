var config = require('../config.json');
var nodemailer = require('nodemailer');
var ses = require('nodemailer-ses-transport');
var path = require('path');
var templatesDir = path.resolve(__dirname, '..', 'views/mailer');
var emailTemplates = require('email-templates');

var EmailAddressRequiredError = new Error('email address required');


var defaultTransport = nodemailer.createTransport(ses({
    accessKeyId: config.mailer.sesKeyId,
    secretAccessKey: config.mailer.sesKey,
    region: config.mailer.region
}));

var htmlToText = require('nodemailer-html-to-text').htmlToText;
defaultTransport.use('compile', htmlToText({hideLinkHrefIfSameAsText: true, wordwrap: false}))


module.exports = function(app) {	
	app.mailer = {};

	app.mailer.sendRegisterNotification = function(data, cb) {
		sendTemplate("register", data.email, "Welcome", data, cb);
	}
	app.mailer.sendPasswordResetLink = function(data, cb) {
		sendTemplate("passwordReset", data.email, "Password reset", data, cb);
	}
	app.mailer.sendPasswordChangedNotification = function(user, cb) {
		sendTemplate("passwordChanged", data.email, "Password changed", data, cb);
	}
	app.mailer.sendDeviceToken = function(data, cb) {
		sendTemplate("deviceToken", data.user.email, "Device credentials", data, cb, {
			filename: data.user.username+"-"+data.device.devicename+".otrc", 
			content: JSON.stringify(data.payload), 
			contentType: "application/json", 
			encoding: "utf8",
			contentDisposition: "attachment; filename=" + data.user.username+"-"+data.device.devicename+".otrc"
		});
	}
	app.mailer.sendNewTrackingUserNotification = function(data, cb) {
		sendTemplate("newTracker", data.user.email, "Shared device", data, cb);
	}


	var sendTemplate = function (templateName, to, subject, locals, fn, attachment) {
		console.log("sending mail " +templateName + " to: " + to);
		// make sure that we have an user email
		if (!to) {
			return fn(EmailAddressRequiredError);
		}
		// make sure that we have a message
		if (!subject) {
			return fn(EmailAddressRequiredError);
		}
		emailTemplates(templatesDir, function (err, template) {
			if (err) {
				//console.log(err);
				return fn(err);
			}


			// Send a single email
			template(templateName, {config: config, data: locals}, function (err, html, text) {
				if (err) {
					//console.log(err);
					return fn(err);
				}

				var transport = defaultTransport;
				transport.sendMail({
					from: config.mailer.from,
					to: to,
					subject: "[OwnTracks Hosted] " + subject,
					html: html,
					attachments: attachment ? [attachment] : undefined
				}, function (err, responseStatus) {
					if (err) {
						//app.statsd.increment("sent-mails-failed")
						return fn(err);
					}
				//		app.statsd.increment("sent-mails-success")
					if(fn)
						return fn(null, responseStatus.message, html, text);
				});
			});
		});
	};
}
