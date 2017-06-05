#!/usr/bin/env python

# Do a reverse-geo lookup (using Google) and cache the result for the
# 'short' lat/lon in a database table, using that as lookup if possible.

try:
    import json
except ImportError:
    import simplejson as json

import urllib2
from dbschema import Geo, sql_db

def plugin(item, m2s=None):

    revgeo = 'unknown'

    short_lat = round(float(item.get('lat', 0)), 3)
    short_lon = round(float(item.get('lon', 0)), 3)

    try:
        g = Geo.get(Geo.lat == short_lat, Geo.lon == short_lon)
        print "********* GEOCACHED ", short_lat, short_lon
        revgeo = g.rev
    except:
        try:
            url = 'http://maps.googleapis.com/maps/api/geocode/json' + \
                    '?latlng={},{}&sensor=false'.format(short_lat, short_lon)
            google_data = json.load(urllib2.urlopen(url))

            print "********* NEW GEO"
            revgeo = google_data['results'][0]['formatted_address']
            data = {
                'lat' : short_lat,
                'lon' : short_lon,
                'rev' : revgeo,
            }
            g = Geo(**data)
            g.save()
        except Exception, e:
            raise
            logging.info("Cannot store GEO in DB: %s" % (str(e)))

    return  (revgeo, dict(revgeo=revgeo))

if __name__ == '__main__':

    item = {
        'lat' :  "48.858334",
        'lon' :  "2.295134",
    }


    (v, d) = plugin(item, None)
    print v
