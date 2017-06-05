#!/usr/bin/env python

import redis

r = redis.StrictRedis(host='localhost', port=6379, db=0)

authed = r.keys("mplug-auth:*")
for auth in authed:     # mplug-auth:PERMIT:jpm|2g
    (key, perm, username) = auth.split(':')

    authcount = r.get(auth)
    print username, perm, authcount

    # ACL key: mplug-acl:jpm|2g

    # show user's details

    acl_details = r.hgetall("mplug-acl:%s" % username)
    for k in acl_details:
        print "   ", k, acl_details[k]
    
