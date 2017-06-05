var config = require('../config.json');
var slack = require('slack-notify')(config.slack.webhookUrl);


module.exports = function(app) {
	app.slack = {}; 
	app.slack.sendAccountCreationNotification = function(user) {
		var provider = 'local'; 
		slack.send({
        		username: 'HostedBot',
        		text: "Account created",
        		channel: "#hosted",
        		unfurl_links: 1,
        		icon_emoji: ':bust_in_silhouette:',
        		fields: {
				'User id'   : user.id,  
        	        	'User name' : user.username,
				'Full name' : user.fullname,
        	        	'Email' : user.email,
        		}
		});
	}

        app.slack.sendAccountDeletionNotification = function(user) {
                var provider = 'local';
                slack.send({
                        username: 'HostedBot',
                        text: "Account deleted",
                        channel: "#hosted",
                        unfurl_links: 1,
                        icon_emoji: ':bust_in_silhouette:',
                        fields: {
                                'User id'   : user.id,
                                'User name' : user.username,
                                'Full name' : user.fullname,
                                'Email' : user.email,
                                'Created at' : user.createdAt,
                        }
                });
        }

        app.slack.sendDeviceCreationNotification = function(device) {
		return; 
                slack.send({
                        username: 'HostedBot',
                        text: "Device created",
                        channel: "#hosted",
                        unfurl_links: 1,
                        icon_emoji: ':bust_in_silhouette:',
                        fields: {
                                'User id'   : device.userId,
                                'Device id' : device.id,
                                'Device name' : device.devicename
                        }
                });
        }



        app.slack.sendAppStartedNotification = function(device) {
                return;
                slack.send({
                        username: 'HostedBot',
                        text: "API application has restarted",
                        channel: "#infra",
                        unfurl_links: 1,
                        icon_emoji: ':bust_in_silhouette:'
                });
        }

}

