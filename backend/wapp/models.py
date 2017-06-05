
import datetime
from flask_peewee.auth import BaseUser
from peewee import *

from app import db

class User(db.Model, BaseUser):
    username = CharField()
    password = CharField()
#    email = CharField()
    active = BooleanField(default=True)
    admin = BooleanField(default=False)

    superuser = BooleanField(default=False)
    pbkdf2 = CharField(null=True)

    def __unicode__(self):
        return self.username

class Acl(db.Model):
    user = ForeignKeyField(User)
    topic = CharField(null=False)
    rw = IntegerField(choices=((0, 'RO'), (1, 'RW')), null=False)

    def __unicode__(self):
        return "%s, %s" % (self.user.username, self.topic)

class Location(db.Model):
    topic           = BlobField(null=False)
    username        = CharField(null=False)
    device          = CharField(null=False)
    lat             = CharField(null=False)
    lon             = CharField(null=False)
    tst             = DateTimeField(default=datetime.datetime.now, index=True)
    acc             = CharField(null=True)
    batt            = CharField(null=True)
    waypoint        = TextField(null=True)  # desc in JSON, but desc is reserved SQL word
    event           = CharField(null=True)
    # optional: full JSON of item including all data from plugins
    json            = TextField(null=True)
    # the following fields must be correlated to settings.py (plugin columns)
    weather         = CharField(null=True)
    revgeo          = CharField(null=True)

    def __unicode__(self):
        return "%s %s (%s)" % (self.username, self.device, self.tst)

class Testing(db.Model):
    name = CharField(null=True)
    number = CharField(null=True)
    spec = CharField(null=True)
    ulist = CharField(null=True)
    author = CharField(null=True)
