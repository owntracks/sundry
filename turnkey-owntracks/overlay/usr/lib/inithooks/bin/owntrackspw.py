#!/usr/bin/python
"""Set OwnTracks username/password for Mosquitto

Option:
    --username=     unless provided, will ask interactively
    --pass=         unless provided, will ask interactively

"""

import sys
import getopt
import os

from dialog_wrapper import Dialog

from executil import system

def usage(s=None):
    if s:
        print >> sys.stderr, "Error:", s
    print >> sys.stderr, "Syntax: %s [options]" % sys.argv[0]
    print >> sys.stderr, __doc__
    sys.exit(1)

def main():
    try:
        opts, args = getopt.gnu_getopt(sys.argv[1:], "h",
                                       ['help', 'pass=', 'username='])
    except getopt.GetoptError, e:
        usage(e)

    username = ""
    password = ""
    for opt, val in opts:
        if opt in ('-h', '--help'):
            usage()
        elif opt == '--pass':
            password = val
        elif opt == '--username':
            username = val

    if not username:
        d = Dialog('TurnKey Linux - First boot configuration')
        username = d.get_input(
            "OwnTracks Mosquitto Username",
            "Enter new username for Mosquitto",
            "jane")

    if not password:
        if 'd' not in locals():
            d = Dialog('TurnKey Linux - First boot configuration')
        password = d.get_password(
            "Mosquitto Password",
            "Enter new password for the Mosquitto '%s' username." % username)

    pwfile = open('/etc/mosquitto/mosquitto.pw', 'w')
    pwfile.write("%s:%s\n" % (username, password))
    pwfile.close()

    os.system("/usr/bin/mosquitto_passwd -U /etc/mosquitto/mosquitto.pw")

    acl = open('/etc/mosquitto/mosquitto.acl', 'a')
# user jjolie
# topic write owntracks/jjolie/#
    acl.write("user %s\ntopic write owntracks/%s/#\n" % (username, username))
    acl.close()


if __name__ == "__main__":
    main()
