# Load our module (and misc) configuration from config.mk
# It also contains MOSQUITTO_SRC
include config.mk

BE_CFLAGS =
BE_LDFLAGS =
BE_LDADD =
BE_DEPS =
OBJS = mplug.o base64.o pbkdf2-check.o log.o hash.o backends.o cache.o

BACKENDS =
BACKENDSTR =

ifneq ($(BACKEND_MYSQL),no)
	BACKENDS += -DBE_MYSQL
	BACKENDSTR += MySQL

	BE_CFLAGS += `mysql_config --cflags`
	BE_LDADD += `mysql_config --libs`
	OBJS += be-mysql.o
endif

OSSLINC = -I$(OPENSSLDIR)/include
OSSLIBS = -L$(OPENSSLDIR)/lib -lcrypto

CFLAGS = -I$(MOSQUITTO_SRC)/src/
CFLAGS += -I$(MOSQUITTO_SRC)/lib/
ifneq ($(OS),Windows_NT)
	CFLAGS += -fPIC -Wall -Werror
endif
CFLAGS += $(BACKENDS) $(BE_CFLAGS) -I$(MOSQ)/src -DDEBUG=1 $(OSSLINC)
LDFLAGS = $(BE_LDFLAGS) -L$(MOSQUITTO_SRC)/lib/
# LDFLAGS += -Wl,-rpath,$(../../../../pubgit/MQTT/mosquitto/lib) -lc
# LDFLAGS += -export-dynamic
# LDFLAGS += -lcares
LDADD = $(BE_LDADD) $(OSSLIBS) -lmosquitto -lhiredis

all: mplug.so

printconfig:
	@echo "Selected backends:         $(BACKENDSTR)"
	@echo "Using mosquitto source dir: $(MOSQUITTO_SRC)"
	@echo "OpenSSL install dir:        $(OPENSSLDIR)"
	@echo
	@echo "If you changed the backend selection, you might need to 'make clean' first"
	@echo

mplug.so : $(OBJS) $(BE_DEPS)
	$(CC) $(CFLAGS) $(LDFLAGS) -fPIC -shared -o $@ $(OBJS) $(BE_DEPS) $(LDADD)

mplug.o: mplug.c be-mysql.h Makefile cache.h
be-mysql.o: be-mysql.c be-mysql.h Makefile
pbkdf2-check.o: pbkdf2-check.c base64.h Makefile
base64.o: base64.c base64.h Makefile
log.o: log.c log.h Makefile
hash.o: hash.c hash.h uthash.h Makefile
cache.o: cache.c cache.h uthash.h Makefile

clean :
	rm -f *.o *.so 

config.mk:
	@echo "Please create your own config.mk file"
	@echo "You can use config.mk.in as base"
	@false
