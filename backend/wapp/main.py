#!/usr/bin/env python

from app import app, db

from auth import *
from admin import admin
from api import api
from models import *
from views import *

admin.setup()
api.setup()

if __name__ == '__main__':
    auth.User.create_table(fail_silently=True)
    Location.create_table(fail_silently=True)
    Acl.create_table(fail_silently=True)
    Testing.create_table(fail_silently=True)    # FIXME: remove

    try:
        port = int(app.config['HTTP_PORT'])
        host = app.config['HTTP_HOST']
    except:
        port = 5000
        host = '127.0.0.1'
    app.run(host=host, port=port)
