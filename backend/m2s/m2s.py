#!/usr/bin/env python
# -*- coding: utf-8 -*-

__author__    = 'Jan-Piet Mens <jpmens()gmail.com>'
__copyright__ = 'Copyright 2013 Jan-Piet Mens'
__license__   = """Eclipse Public License - v 1.0 (http://www.eclipse.org/legal/epl-v10.html)"""

from config import Config
import paho.mqtt.client as paho   # pip install paho-mqtt
import socket
import signal
import logging
import sys
import json
import datetime
import time
try:
    import json
except ImportError:
    import simplejson as json
import Queue
import threading
import imp
try:
    import hashlib
    md = hashlib.md5
except ImportError:
    import md5
    md = md5.new
import os

m2s = None
cf = Config()
try:
    mqtt = paho.Client(cf.get('mqtt_clientid'), clean_session=False)
except Exception, e:
    print"Can't create Paho MQTT object: %s" % (str(e))
    sys.exit(2)

q_in = Queue.Queue(maxsize=0)
num_workers = 1

LOGFILE = cf.get('logfile', 'logfile')
LOGFORMAT = '%(asctime)-15s %(message)s'
DEBUG=True

if DEBUG:
    logging.basicConfig(filename=LOGFILE, level=logging.DEBUG, format=LOGFORMAT)
else:
    logging.basicConfig(filename=LOGFILE, level=logging.INFO, format=LOGFORMAT)

logging.info("Starting")
logging.debug("DEBUG MODE")

# http://code.davidjanes.com/blog/2008/11/27/how-to-dynamically-load-python-code/
def load_module(path):
    try:
        fp = open(path, 'rb')
        return imp.load_source(md(path).hexdigest(), path, fp)
    finally:
        try:
            fp.close()
        except:
            pass

def load_plugins(plugin_list, m2s):
    for p in plugin_list:
        if 'column' in p and 'filename' in p:
            colname = p['column']
            filename = p['filename']

            try:
                p['mod'] = load_module(filename)
                p['m2s'] = m2s
                logging.debug("Plugin [%s] loaded from %s" % (colname, filename))
            except Exception, e:
                logging.error("Can't load %s plugin (%s): %s" % (colname, filename, str(e)))
                sys.exit(1)
        else:
            print "Error in plugin configuration: column or filename missing"


# If a storage plugin has been configured, use it if it's loadable.
# If none has been configured or the plugin cannot be loaded, ignore

storage_module = None
storage_plugin = cf.get('storage_plugin')
if storage_plugin is not None:
    try:
        storage_module = imp.load_source('storage', storage_plugin)
    except Exception, e:
        logging.info("Can't import storage_plugin %s: %s" % (storage_plugin, e))
else:
    logging.warning("No storage plugin configured")

def cleanup(signum, frame):
    """
    Signal handler to disconnect and cleanup.
    """

    logging.info("Disconnecting from broker")
    mqtt.disconnect()
    logging.info("Waiting for queue to drain")
    q_in.join()       # block until all tasks are done
    logging.info("Exiting on signal %d", signum)
    sys.exit(signum)

def on_connect(mosq, userdata, rc):
    """
    Subscribe to topics upon connecting
    """

    for topic in cf.get('topics'):
        logging.info("Subscribing to %s", topic)
        mqtt.subscribe(topic, 2)

def on_disconnect(mosq, userdata, rc):
    logging.info("OOOOPS! disconnect")

def on_publish(mosq, userdata, mid):
    logging.debug("--> PUB mid: %s" % (str(mid)))

def on_subscribe(mosq, userdata, mid, granted_qos):
    pass

def on_message(mosq, userdata, msg):
    """
    We get a message from the broker. If it's retained or it's topic
    contains a blocked word, skip it. Decode the JSON payload, check
    for correct _type (i.e. 'location'), ensure we have 'lat' and
    'lon' and shove it into the queue for the background thread to
    process.
    """

    if msg.retain == 1:
        logging.debug("Skipping retained %s" % msg.topic)
        return

    blocked_topics = cf.get('blocked_topics')
    if blocked_topics is not None:
        for t in blocked_topics:
            if t in msg.topic:
                logging.debug("Skipping blocked topic %s" % msg.topic)
                return

    topic = msg.topic
    payload = str(msg.payload)
    payload = payload.replace('\0', '')

    try:
        data = json.loads(payload)
    except:
        print "Cannot decode JSON on topic %s" % (topic)
        return

    _type = data.get("_type", 'unknown')

    if _type != 'location' and _type != 'waypoint':
        logging.info("Skipping unhandled _type=%s" % (_type))
        return

    lat = data.get('lat')
    lon = data.get('lon')
    tst = data.get('tst', int(time.time()))

    if lat is None or lon is None:
        print "Skipping topic %s: lat or lon are None" % (topic)
        return

    # Split topic up into bits. Standard formula is "owntracks/username/device"
    # so we do that here: modify to taste

    try:
        parts = topic.split('/')
        username = parts[1]
        deviceid = parts[2]
    except:
        deviceid = 'unknown'
        username = 'unknown'

    item = {
        '_type'         : _type,
        'topic'         : topic,
        'device'        : deviceid,
        'username'      : username,
        'lat'           : lat,
        'lon'           : lon,
        'tst'           : tst,
        'acc'           : data.get('acc', None),
        'batt'          : data.get('batt', None),
        'waypoint'      : data.get('desc', None),   # 'desc' is reserved SQL word; rename
        'event'         : data.get('event', None),
        'date_string'   :  time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(int(tst))),
        'rad'           : data.get('rad', None),
        'desc'          : data.get('desc', None),
        't'             : data.get('t', None),
    }

    if 'cog' in data:
        item['cog'] = data['cog']
    if 'vel' in data:
        item['vel'] = data['vel']
    if 'alt' in data:
        item['alt'] = data['alt']
    if 'dist' in data:
        item['dist'] = data['dist']

    # Shove it into the queue
    q_in.put(item)

def processor():
    """
    Do the actual work on a decoded item. Get an item from the queue,
    if weather or reverse geo-coding are desired, do that, and save
    the result into persistent storage.
    """

    global m2s

    while True:
        item = q_in.get()

        topic = item.get('topic')
        lat = item.get('lat')
        lon = item.get('lon')

        logging.debug("WORKER is handling %s" % (topic))
        logging.debug(item)

        if lat is not None and lon is not None:
            """
            For each configured plugin, invoke it. The plugin returns a tuple
            (value, data). The former is a string, the latter can be a dict.
            Set item[colname] to the string 'value' and merge the data dict into
            the current 'item', ensuring that no overwriting occurs (e.g. the
            plugin cannot modify 'lat' or 'lon', etc.

            If either of the returned values is None, skip that step.
            """

            plugin_list = cf.get('data_plugins', None)
            if plugin_list is not None:

                for p in plugin_list:
                    if 'column' in p and 'mod' in p:
                        colname = p['column']

                        try:
                            (value, data) = p['mod'].plugin(item, p['m2s'])
                            if value is not None:
                                # locals()[colname] = value
                                item[colname] = value
                            if data is not None:
                                item = dict(data.items() + item.items())
                        except Exception, e:
                            logging.warning("Cannot invoke [%s] plugin: %s" % (colname, str(e)))


            if storage_module is not None:
                try:
                    # Add the JSON of the full 'item' into item
                    item['json'] = json.dumps(item)
                    storage_module.storage(topic, item, m2s)
                except Exception, e:
                    logging.info("storage_plugin %s: %s" % (storage_plugin, e))


        else:
            logging.info("WORKER: can't work: lat or lon missing!")

        q_in.task_done()

class M2SConfig(object):
    def __init__(self, pluco):
        if pluco is not None:
            for k in pluco.keys():
                setattr(self, k, pluco[k])

    def __setattr__(self, name, value):

        if not hasattr(self, name):
            object.__setattr__(self, name, value)
        else:
            raise TypeError("%r setting may not be modified" % self)


class M2S(object):
    def __init__(self, mqttc, plugin_config):
        self.mqttc = mqttc
        self.cf = M2SConfig(plugin_config)

    def publish(self, topic, payload, qos=0, retain=False):
        rc, mid = self.mqttc.publish(topic, payload, qos=qos, retain=retain)
        return (rc, mid)

    def info(self, s=None):
        if s is not None:
            logging.info(s)

def main():
    """
    Connect to broker, launch daemon thread(s) and listen forever.
    """
    global m2s

    m2s = M2S(mqtt, cf.get('plugin_configs'))

    if cf.get('data_plugins') is not None:
        load_plugins(cf.get('data_plugins'), m2s)

    mqtt.on_connect = on_connect
    mqtt.on_disconnect = on_disconnect
    mqtt.on_subscribe = on_subscribe
    # mqtt.on_publish = on_publish
    mqtt.on_message = on_message
    # mqtt.on_log = on_log

    username = cf.get('mqtt_username')
    password = cf.get('mqtt_password')

    if username is not None and password is not None:
        mqtt.username_pw_set(username, password)

    host = cf.get('mqtt_broker', 'localhost')
    port = int(cf.get('mqtt_port', '1883'))

    try:
        mqtt.connect(host, port, 60)
    except Exception, e:
        logging.info("MQTT connection failed: %s" % (str(e)))
        sys.exit(1)

    # Launch worker threads to operate on queue
    for i in range(num_workers):
         t = threading.Thread(target=processor)
         t.daemon = True
         t.start()


    while True:
        try:
            mqtt.loop_forever()
        except socket.error:
            logging.info("MQTT server disconnected; sleeping")
            time.sleep(5)
        except:
            raise


if __name__ == '__main__':
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    main()
