#!/usr/bin/env python

def plugin(item, m2s=None):
    """
    The item{} dict contains whatever m2s (or other plugins which
    ran before this one) have added to it. In any case it'll contain
    'lat' and 'lon'.

    `m2s' is an object with the following helper functions:
        .publish(topic, payload, qos=0, retain=False)
        .info(string)       # logging.info() to the m2s log

    This plugin returns a tuple of two values: a string and a dict.
    The string is stored in the database column of the same name
    as the plugin is called, unless the value is None, in which case
    the underlying storage plugin will ignore this value.

    The dict is merged into item{} and passed on to subsequent
    plugins and finally to the storage plugin.
    """

    lat = item['lat']
    lon = item['lon']
    
    # use lat, lon and do something

    print "***** EXAMPLE: lat=%s, lon=%s" % (lat, lon)

    """
    Examples:
    1. Use this plugin to do notifications (e.g. NMA, Prowl)

        do_notification("something")
        return (None, None)

    2. Publish (or re-publish) something to the same broker

        m2s.publish(str("xoxo/one"), str("Hello %s!" % (lat)))
        return (None, None)
        
    3. Store a value in the database, in a column called 'xname'
        a. ensure column `xname` is defined in dbschema.py
        b. add plugin for column 'xname' to settings.py

        value = "Blabla1"
        return (value, None)

    4. Store a dict of values in the `json' column of the database
       (adding to item stored there already)

        data = { 'val' : 2, 'number' : 3, ...}
        return  (None, dict(my_values=data))

    5. Publish a new value to a new topic with 'weather' obtained by a
       plugin which ran BEFORE this one:

        current = item['weather']
        m2s.publish(str("location/weather"), str(weather))
        return (None, None)


    """
    current = item['weather']
    m2s.publish(str("xoxo/one"), str("Hello %s %s!" % (lat, current)))
    return (None, None)

    new_data = {
            "name" : "Jane Jolie",
            "number" : 49,
    }

    value = "Something"

    # The key in the dict will be added to item{} upon returning
    # from this function

    return  (value, dict(example=new_data))
