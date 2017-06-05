
from flask import render_template, jsonify, flash, redirect, url_for, request, Response

from app import app
from auth import auth
from models import User, Location, Testing
from flask_wtf import Form
from wtforms import TextField, HiddenField, ValidationError, RadioField,\
    BooleanField, SubmitField, SelectField
from wtforms.validators import Required, Optional


choices = [
    ('1', 'Alice'),
    ('2', 'Bob'),
    ('3', 'Carol'),
]

class Jform(Form):
    name = TextField('Name', description='Your name')
    number = TextField('Number', description='Number as text', validators=[Required()])
    spec = SelectField('Pic name', choices=choices)
    ulist = SelectField('User name', validators=[Optional()])

    submit_button = SubmitField('Submit Form')

@app.route('/', methods = ['GET', 'POST'])
def mainpage():
    
    form = Jform()
    print request.args
    print form.is_submitted()
    form.spec.data = '2' # pre-select choice

    # user_q = User.select()
    user_q = User.select(User.id, User.username).distinct().where(User.username != 'admin')
    user_q = user_q.order_by(User.username.asc())


    # form.ulist.choices = [ (u.id, u.username) for u in user_q]
    form.ulist.choices = [ (str(u.id), u.username) for u in user_q]
    print form.ulist.choices

    if form.validate_on_submit():
        tt = Testing(name=form.name.data,
                     number=form.number.data,
                     spec=form.spec.data,
                     ulist=form.ulist.data,
                     author='xxxx') #author=users.get_current_user())
        tt.save()
        flash('Thanks, babe!')
        return redirect(url_for('mainpage'))




    return render_template('welcome.html', form=form)

@app.route('/list')
def hello_world():
    username = 'jpm'
    device = '5s'
    from_date = '2013-10-08'
    to_date = '2013-12-31'

    query = Location.select().where(
                (Location.username == username) &
                (Location.device == device) &
                (Location.tst.between(from_date, to_date))
            )
    query = query.order_by(Location.tst.asc())

    print query

    return render_template('base.html', location=query)

@app.route('/map')
def show_map():
    return render_template('map.html')

# An isodate filter for Jinja2. Gets a datetime object
# passed to it, and returns an ISO format (Zulu)
@app.template_filter('isodate')
def _jinja2_filter_datetime(dt):
    return dt.isoformat()[:19]+'Z'

@app.route('/gpx/<username>/<device>/<from_date>/<to_date>')
def gpx_generate(username, device, from_date, to_date):
    
    query = Location.select().where(
                (Location.username == username) &
                (Location.device == device) &
                (Location.tst.between(from_date, to_date))
            )
    query = query.order_by(Location.tst.asc())

    result = render_template('gpx.html', data=query)

    return Response(result, mimetype='text/xml')
