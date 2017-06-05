## OTAP

This is the OTAP server for OwnTracks Greenwich.

### Installation notes

1. Clone the repository
2. Run `./generate-key.py` to create a secret key.
3. Create `otap.conf` from `.sample` and adapt. In particular, copy the secret key you generated into this, and make it available to `otc` in your environment.
4. If you're running the server (`otap.py`) locally, use something like this:

```shell
export OTC_URL=http://localhost:8810
export OTC_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

./otc.py "$@"
```

Invoking `otc.py` without arguments (or incorrect arguments) will display it's usage:

```
Usage:
      otc ping
      otc show [<imei>]
      otc find <word>
      otc imei <tid> [<custid>]
      otc setcomment <imei> <text>
      otc setflags <imei> <flagstring>
      otc jars
      otc add <imei> <custid> <tid>
      otc deliver <imei> <version>
      otc block [--all] [<imei>]
      otc unblock [--all] [<imei>]
      otc upload <filename> [--force]
      otc purge <version>
      otc versioncheck <imei> <custid> <version>
      otc otap <imei> <custid>
      otc showconfig <custid>
      otc versionlog [<count>]
      otc define <name> <settings>
      otc undef <name>
      otc showsets [<imei>]
      otc set [--once] <imei> <name>
      otc unset <imei> <name>
```

### OTC

_otc_ is the OTAP Control program which speaks JSON RPC to the OTAP daemon. The
following commands are supported:

* `ping`. If "PONG" is returned, all is good. If you see "pong", then the secret key isn't correctly configured between `otap.py` and `otc.py`.

* `show` [_imei_]
* `imei`. Displays the IMEI number for _tid_. Specify an optional _custid_ if needed.
* `setcomment`. Add a _text_ comment to database for _imei_.
* `setflags`. Add case-sensitive _flagsstring_ to database for _imei_.
  * `v` Notify on versioncheck even if upgrade == 0

* `deliver` _imei_ _version_ where _version_ may be any installed JAR version number, the word "`*`" which means any most recent version ("`ANY` is synonym for `*`), or "`latest`" which is the current latest version (i.e. the higest version currently displayed by the `jars` command).
* `find`. Search for _word_ in either _custid_ or _tid_ in the otap database table.
* `jars`. Show installed JAR versions
* `add`. Add a device with _custid_ and _tid_ to the database.
* `block`. Prohibit _imei_ to do OTAP.
* `unblock`. Enable _imei_ to do OTAP.
* `upload`. Upload a Jar file to the OTAP server. The specified filename must be a JAR file.
* `purge`. Remove a jar from the server. If a particular version is queued for `deliver`y to a device, the jar will not be removed
* `versioncheck`. Simulate a versionCheck
* `otap`: Simulate an OTAP request (the `.jad` is returned)
* `showconfig`. Show the OTAP configuration required for OwnTracks Greenwich
* `versionlog`. Show _count_ records from the versioncheck log
* `define`. Define a named parameter-set with semicolon-separated settings
* `undef`. Remove the set
* `set`. Define parameter set _name_ to be assigned to _imei_ permantently. The optional --once will provide it once only at next versioncheck
* `unset`. Remove assigned parameter _name_ from _imei_.
* `showsettings`. Print a list of setting sets. If _imei_ is specified show those only.

### OTAP

`otap.py` is the server-side. It creates the necessary database tables upon startup and
waits for commands to it (see `otc` above for a list of commands).

### uWSGI

##### /etc/uwsgi/apps-enabled/otap.ini
```ini
[uwsgi]
base = /home/owntracks/otap
socket = /var/run/uwsgi/app/%n.sock
chdir = %(base)
file  = otap.py
env = OTAPCONFIG=/home/owntracks/otap/otap.conf
plugins = python
uid = www-data
gid = www-data
logto = /var/log/uwsgi/app/%n.log

py-autoreload = 1
```

##### /etc/nginx/sites-enabled/otap.example.com

```
server {
        listen 80;
        server_name otap.example.com;

        access_log /var/log/nginx/otap.log;

        root /var/www/otap.example.com;
        index index.php index.html index.htm;

        location / {
                include uwsgi_params;
                uwsgi_pass unix:///var/run/uwsgi/app/otap.sock;
        }
        location /rpc {
                include uwsgi_params;
                uwsgi_pass unix:///var/run/uwsgi/app/otap.sock;
        }
}
```
