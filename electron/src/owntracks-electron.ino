/*
 * owntracks-electron.ino (C)2016 by Christoph Krey & JP Mens
 *
 * GPS module must be connected to Serial at 9600bd. The Electron
 * will, periodically, publish location data and battery status
 * via the Particle Cloud and then, if the configured `interval' is
 * set, go into deep sleep for `interval' seconds.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by the
 * Free Software Foundation, version 2.1 of the License.
 */

#include "TinyGPS++.h"
#include "cellular_hal.h"
#include "apn.h"

/*
 * When connecting an Adafruit Ultimate GPS, optionally
 * wire the ENable pin from the GPS board to the Electron
 * and define ENABLE_PIN to the digital pin on the Electron.
 */

#define ENABLE_PIN	D4


long lastSync;
long lastCell;

char status[128];

int set_interval(String secs);		// Particle function

#define INTERVAL_ADDRESS 0x000A
#define INTERVAL_DEFAULT 600
uint32_t interval;			// "publish" interval in seconds

long last_fix;
double lat;
double lon;
double SoC;

TinyGPSPlus gps;
FuelGauge fuel;

void setup()
{
	RGB.control(true);

	Serial1.begin(9600);
#ifdef ENABLE_PIN
	pinMode(ENABLE_PIN, OUTPUT);
	digitalWrite(ENABLE_PIN, HIGH);
#endif

#ifdef APNxxx
	STARTUP(cellular_credentials_set(APN, USERNAME, PASSWORD, NULL));
#endif

	Cellular.on();
	Cellular.connect(WIFI_CONNECT_SKIP_LISTEN);
	Particle.connect();
	Particle.connected();

	Time.zone(0);
	lastSync = Time.now();
	lastCell = 0;

	EEPROM.get(INTERVAL_ADDRESS, interval);
	if (interval == 0xFFFFFFFF) {
		interval = INTERVAL_DEFAULT;
		EEPROM.put(INTERVAL_ADDRESS, interval);
	}

	Particle.variable("status", status);
	Particle.function("interval", set_interval);
}

void loop()
{
	/* sync the clock once a day */
	if (Time.now() > lastSync + 86400) {
		Particle.syncTime();
		lastSync = Time.now();
	}

	/* read battery state every 10 min */
	if (Time.now() > lastCell + 600) {
		SoC = fuel.getSoC();
		lastCell = Time.now();
	}

	/* read gps */
	while (Serial1.available()) {
		char c = Serial1.read();
		gps.encode(c);
	}
	if (gps.location.isValid()) {
		last_fix = Time.now() - gps.location.age() / 1000;
		lat = gps.location.lat();
		lon = gps.location.lng();
	}

	/* Status show GPS and Connection status alternating
	 *
	 * show red LED if gps location is not valid
	 * show greed LED no gps location is available
	 *
	 * show blue LED if connected
	 * show no LED if not connected
	 */
	if (Time.now() % 2 == 0) {
		if (gps.location.isValid()) {
			RGB.color(0, 255, 0);
		} else {
			RGB.color(255, 0, 0);
		}
	} else {
		if (Particle.connected()) {
			RGB.color(0, 0, 255);
		} else {
			RGB.color(0, 0, 0);
		}
	}

	/* set cloud variable */
	snprintf(status, sizeof(status), "%ld,%.6f,%.6f,%.1f,%ld",
		last_fix, lat, lon, SoC, interval);

	if (gps.location.isValid()) {
		while (!Particle.publish("owntracks", status, 600, PRIVATE)) {
			/* indicator for unsuccessfull publish */
			for (int i = 5; i; i--) {
				RGB.color(255, 0, 0);
				delay(333);
				RGB.color(0, 0, 0);
				delay(667);
			}
		}
#ifdef ENABLE_PIN
		/* Switch off GPS module */
		digitalWrite(ENABLE_PIN, LOW);
#endif
		/* countdown before going to sleep */
		for (int i = 10; i; i--) {
			RGB.color(0, 255, 0);
			delay(333);
			RGB.color(0, 0, 0);
			delay(667);
		}
		if (interval) {
			Cellular.disconnect();
			Cellular.off();
			System.sleep(SLEEP_MODE_DEEP, interval);
		}
	}
}

int set_interval(String secs)
{
	int n = atoi(secs);

	if (n >= 0) {
		interval = n;
		EEPROM.put(INTERVAL_ADDRESS, interval);
		return (1);
	}
	return (0);	// tell caller this failed
}
