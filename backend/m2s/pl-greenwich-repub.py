#!/usr/bin/env python

import time
import json
import re

def plugin(item, m2s=None):

    new_topic = re.sub('^owntracks/', m2s.cf.greenwich_repub, item['topic'])

    new_data = {
        '_type'    : item['_type'],
        'lat'      : item['lat'],
        'lon'      : item['lon'],
        'tstamp'   : time.strftime('%d/%H:%M:%S', time.localtime(int(item.get('tst', int(time.time()))))),
        'batt'     : item.get('batt', '?'),
        'vel'      : item.get('vel', ''),
        'cog'      : item.get('cog', ''),
        'alt'      : item.get('alt', ''),
        'weather'  : item.get('weather', ''),
        'geo'      : item.get('revgeo', ''),
    }

    try:
        t = item.get('t', None)
        if t is not None:
            if t == 'p':    # ping from iOS devices
                return (None, None)
    except:
        pass

    if new_data['_type'] == 'location':

        payload = json.dumps(new_data);
        m2s.info("republish at %s: %s" % (new_topic, payload))

        m2s.publish(new_topic, payload, qos=0, retain=False)

    return (None, None)
