
from flask_peewee.admin import Admin, ModelAdmin

from app import app, db
from auth import auth
from models import User, Location, Acl
from pbkdf2 import hashing_passwords as hp

admin = Admin(app, auth, branding='MQTTitude')

# or you could admin.register(User, ModelAdmin) -- you would also register
# any other models here.

class LocationAdmin(ModelAdmin):
    columns = ('tst', 'username', 'device', 'lat', 'lon', )

class UserAdmin(ModelAdmin):
    columns = ('username', 'superuser', 'pbkdf2',)

    # Upon saving the User model in admin, set the PBKDF2 hash for
    # the password

    def save_model(self, instance, form, adding=False):
        orig_password = instance.password

        pbkdf2 = hp.make_hash(instance.password)
        print "***** ", instance.password, pbkdf2
        print "----- ", orig_password, form.password.data

        user = super(UserAdmin, self).save_model(instance, form, adding)

        user.pbkdf2 = pbkdf2
        if orig_password != form.password.data:
                user.set_password(form.password.data)
        user.save()

        return user

class AclAdmin(ModelAdmin):
    columns = ('user', 'topic', 'rw',)
    foreign_key_lookups = {'user': 'username'}
    filter_fields = ('user', 'topic', 'rw', 'user__username')
    exclude = ('user__password', )

auth.register_admin(admin)
admin.register(User, UserAdmin)
admin.register(Location, LocationAdmin)
admin.register(Acl, AclAdmin)
