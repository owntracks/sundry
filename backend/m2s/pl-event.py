#!/usr/bin/env python

import time

def plugin(item, m2s=None):
    '''Handle events. If any of the values we require aren't in
       the item dict, return. Otherwise, check for location messages
       and format a message to be notified

       This plugin returns (None, None) always, because there's nothing
       we want to store.
    '''

    try:
        _type    = item['_type']
        tst      = item['tst']
        timestr  = time.strftime('%H:%M', time.localtime(int(tst)))
        username = item.get('username', 'unknown')
        device   = item.get('device', 'unknown')
        desc     = item.get('desc', 'wp-unknown')
        event    = item['event']
    except:
        return (None, None)

    if _type != 'location' or event is None:
        return (None, None)

    payload = "{username} ({device}) => {event}: {desc} at {timestr}".format(
            timestr=timestr,
            username=username,
            device=device,
            event=event,
            desc=desc
        ).encode('utf-8')


    try:
        topic = "%s/%s/%s" % (m2s.cf.event_notifications, username, device)
        m2s.info("notify event at %s: %s" % (topic, payload))
        m2s.publish(topic, payload, qos=0, retain=False)
    except:
        pass

    return (None, None)
