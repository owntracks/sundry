#!/usr/bin/env python

import mosquitto
import json

__author__    = 'Jan-Piet Mens <jpmens()gmail.com>, Ben Jones <ben.jones12()gmail.com>'
__copyright__ = 'Copyright 2014 Jan-Piet Mens'

topic = 'owntracks/jjolie/ipod'

URLFMT = "https://maps.google.com/?q=%s,%s\n"

def on_message(mosq, userdata, msg):
    try:
        data = json.loads(str(msg.payload))
    except:
        print "Can't decode payload"
    try:
        f = open('location.current', 'w')
        f.write(URLFMT % (data['lat'], data['lon']))
        f.close()
    except Exception, e:
        print "Can't write file: %s" % str(e)

mqttc = mosquitto.Mosquitto()
mqttc.on_message = on_message

mqttc.connect("localhost", 1883, 60)
mqttc.subscribe(topic, 0)

mqttc.loop_forever()
