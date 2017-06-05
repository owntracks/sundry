#!/usr/bin/env python
# -*- coding: utf-8 -*-

import paho.mqtt.client as paho   # pip install paho-mqtt
import json
import pynsca                     # https://pypi.python.org/pypi/pynsca
from pynsca import NSCANotifier

icinga_host = 'icinga.ww.mens.de'

__author__    = 'Jan-Piet Mens <jpmens()gmail.com>'
__copyright__ = 'Copyright 2014 Jan-Piet Mens'
__license__   = """Eclipse Public License - v 1.0 (http://www.eclipse.org/legal/epl-v10.html)"""

def on_connect(mosq, userdata, rc):
    mqttc.subscribe("owntracks/+/+", 0)

def on_message(mosq, userdata, msg):
    print "%s (qos=%s, r=%s) %s" % (msg.topic, str(msg.qos), msg.retain, str(msg.payload))
    if msg.retain == 1:
        return

    try:
        # owntracks/username/deviceid
        prefix, username, device = msg.topic.split('/', 3)
    except:
        return

    try:
        data = json.loads(msg.payload)
    except:
        return

    if 'batt' not in data:
        return

    level = int(data['batt'])

    status = pynsca.OK
    if level < 50:
        status = pynsca.WARNING
    if level < 20:
        status = pynsca.CRITICAL

    service = 'OwnTracks %s' % username
    message = 'Battery level for %s is %s' % (device, level)
    notif = NSCANotifier(icinga_host)
    notif.svc_result('localhost', service, status, message)

def on_disconnect(mosq, userdata, rc):
    print "OOOOPS! disconnect"

mqttc = paho.Client('battery-notifier', clean_session=False, userdata=None)
mqttc.on_message = on_message
mqttc.on_connect = on_connect
mqttc.on_disconnect = on_disconnect

mqttc.connect("localhost", 1883, 60)
mqttc.loop_forever()
