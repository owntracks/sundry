#!/usr/bin/env python

# Example plugin for m2s. Requires pl-weather and pl-revgeo to have been
# invoked before it.
# Format the information we have so far, and republish to a different
# topic branch. The topic name is obtained via `m2s.cf.republish_topic`
# which is loaded from settings.py

import time

def plugin(item, m2s=None):

    topic = m2s.cf.republish_topic

    try:
        _type    = item['_type']
        lat      = item['lat']
        lon      = item['lon']
        tst      = item['tst']
        timestr  = time.strftime('%H:%M', time.localtime(int(tst)))
        username = item['username']
        device   = item['device']
        acc      = item['acc']
        waypoint = item.get('waypoint', 'wp-unknown')
        event    = item.get('event', None)
        rad      = item.get('rad', None)
        if 'weather' in item:
            weather = item['weather']
        else:
            weather = 'unknown'

        address = 'unknown'
        if 'nominatim' in item:
            if 'display_name' in item['nominatim']:
                address = item['nominatim']['display_name']
    except:
        return (None, None)

    try:
        t = item.get('t', None)
        if t is not None:
            if t == 'p':    # ping from iOS devices
                return (None, None)
    except:
        pass

    if m2s.cf.republish_users and username not in m2s.cf.republish_users:
        return (None, None)

    if m2s.cf.republish_devices and device not in m2s.cf.republish_devices:
        return (None, None)


    '''
    The published payload will look like this (wrapped) for a Location publish

        jjolie-ipod 18:18 (Rain 2.6C) http://maps.google.com/?q=48.858334,2.295134 (1414m) Tour \
                Eiffel, Avenue Pierre Loti, Gros-Caillou, 7e Arrondissement, Paris...
    '''

    if _type == 'location':

        fmt = m2s.cf.republish_location_fmt
        if fmt is None:
            fmt = u'{username}-{device} {timestr} ({weather}) http://maps.google.com/?q={lat},{lon} ({acc}) {address}'

        if event is not None:
            fmt = m2s.cf.republish_event_fmt
            if fmt is None:
                fmt = u'{username}-{device} {timestr} => {event} {waypoint} ({weather})'
    if _type == 'waypoint':
        fmt = m2s.cf.republish_waypoint_fmt
        if fmt is None:
            fmt = u'{username}-{device} {timestr} Waypoint: {waypoint} ({rad}) {lat}/{lon}'

    payload = fmt.format(
            username=username,
            device = device,
            weather = weather,
            lat = lat,
            lon = lon,
            acc = acc,
            address = address,
            timestr = timestr,
            event = event,
            waypoint = waypoint,
            rad = rad,
        ).encode('utf-8')

    topic = m2s.cf.republish_topic

    m2s.info("republish at %s: %s" % (topic, payload))

    m2s.publish(topic, payload, qos=0, retain=False)

    return (None, None)
