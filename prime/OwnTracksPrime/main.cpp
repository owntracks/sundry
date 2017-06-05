/*
 * OwnTracks Prime
 * main.cpp (C)2016 by Christoph Krey
 *
 * Uses an u-blox CO27 board
 *
 * Connects via 2G or 3G to an mqtt broker
 * Sets RTC from GPS input
 *
 * Transmits position once on startup and
 * once every hour if not moved more than 100m
 * once a minute if moved more than 100m
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by the
 * Free Software Foundation, version 2.1 of the License.
 */

#include "mbed.h"

extern "C" void mbed_reset();

#include "MQTTSocket.h"

#include "rtos.h"
#include "MQTTwolf.h"

#include "MQTTmbed.h"
#include "MQTTClient.h"

#include "prime.h"
#include "math.h"
#ifndef M_PI
#    define M_PI 3.14159265358979323846
#endif

#include "GPS.h"
#include "MDM.h"
//------------------------------------------------------------------------------------
// You need to configure these cellular modem / SIM parameters.
// These parameters are ignored for LISA-C200 variants and can be left NULL.
//------------------------------------------------------------------------------------
//! Set your secret SIM pin here (e.g. "1234"). Check your SIM manual.
#define SIMPIN      NULL
/*! The APN of your network operator SIM, sometimes it is "internet" check your
    contract with the network operator. You can also try to look-up your settings in
    google: https://www.google.de/search?q=APN+list */
#define APN         "datamobile.ag"
//! Set the user name for your APN, or NULL if not needed
#define USERNAME    "data@datamobile.ag"
//! Set the password for your APN, or NULL if not needed
#define PASSWORD    "dmag"
//------------------------------------------------------------------------------------

//#define CELLOCATE

static char* mqtt_server = MQTTHOST;
static int mqtt_port = MQTTPORT;

static char deviceID[23 + 1];
static char pubtopic[128];
static char subtopic[128];
static char payload[256];

#define BASETOPIC   "owntracks/prime"   // no trailing slash!
#define RECONNECTINTERVAL   60000 // 300000         // ms (5m)
#define STORE       "/data/owntracks.log"
#define PINGINTERVAL        (60 * 60 * 1000)        // ms

#define MINDIST 100
#define MININTERVAL 60
#define MAXINTERVAL 3600

MQTTSocket mqttSocket;
MQTT::Client<MQTTSocket, Countdown, 256, 5> *client;

MQTTwolf mqttWolf;
MQTT::Client<MQTTwolf, Countdown, 256, 5> *tlsClient;

DigitalOut myled(LED1);

void blink(int n)
{
    for (int i = n; i; i--) {
        myled = 1;
        Thread::wait(100);
        myled = 0;
        Thread::wait(100);
    }
    Thread::wait(200);

}

bool sendMin = false;
bool sendMax = false;
bool sendDist = false;
bool sendOnce = true;
bool setTime = true;
bool off = false;
bool reset = false;

bool mdmInit = false;
bool mdmRegister = false;
bool mdmIP = false;
bool socketConnect = false;
bool mqttConnect = false;

double lastLa = 0, lastLo = 0;
double la = 0, lo = 0;
double alt = -1;
double vel = -1;
double cog = -1;
double tst = 0;
int day = 0;

void messageArrived(MQTT::MessageData& md)
{
#warning ota
#warning dump
#warning set
    MQTT::Message &message = md.message;

    printf("Message arrived: qos %d, retained %d, dup %d, packetid %d %s\r\n",
           message.qos, message.retained, message.dup, message.id, md.topicName.cstring);
    printf("Payload %.*s\r\n", (int)message.payloadlen, (char*)message.payload);

    if ((int)message.payloadlen == strlen("gps") && memcmp(message.payload, "gps", strlen("gps")) == 0) {
        sendOnce = true;
    }
    if ((int)message.payloadlen == strlen("reset") && memcmp(message.payload, "reset", strlen("reset")) == 0) {
        off = true;
        reset = true;
    }
    if ((int)message.payloadlen == strlen("off") && memcmp(message.payload, "off", strlen("off")) == 0) {
        off = true;
    }
}

time_t lastMin;
time_t lastMax;
time_t lastTime;

double distanceBetween(double lat1, double long1, double lat2, double long2)
{
    // returns distance in meters between two positions, both specified
    // as signed decimal-degrees latitude and longitude. Uses great-circle
    // distance computation for hypothetical sphere of radius 6372795 meters.
    // Because Earth is no exact sphere, rounding errors may be up to 0.5%.
    // Courtesy of Maarten Lamers
    printf("Distance: (%.6f,%.6f) (%.6f,%.6f) ", lat1, long1, lat2, long2);

    double delta = fabs(long1-long2) * M_PI / 180.0;
    double sdlong = sin(delta);
    double cdlong = cos(delta);
    lat1 = fabs(lat1) * M_PI / 180.0;
    lat2 = fabs(lat2) * M_PI / 180.0;
    double slat1 = sin(lat1);
    double clat1 = cos(lat1);
    double slat2 = sin(lat2);
    double clat2 = cos(lat2);
    delta = (clat1 * slat2) - (slat1 * clat2 * cdlong);
    delta = (delta) * (delta);
    delta += (clat2 * sdlong) * (clat2 * sdlong);
    delta = sqrt(delta);
    double denom = (slat1 * slat2) + (clat1 * clat2 * cdlong);
    delta = atan2(delta, denom);
    printf("= %.6f\r\n", delta * 6372795.0);

    return delta * 6372795.0;
}

double gpstime(int day, double tst)
{
    struct tm t;
    time_t secs;

    t.tm_sec        = fmod(tst, 100.0);
    t.tm_min        = fmod(tst / 100.0, 100.0);
    t.tm_hour       = fmod(tst / 10000.0, 100.0);
    t.tm_mday       = (day / 10000) % 100;
    t.tm_mon        = ((day / 100) % 100) - 1;
    t.tm_year       = (day % 100) < 70 ? (day % 100) + 100 : (day % 100);

    secs = mktime(&t);
    return secs;
}

void gpstime_set(int day, int tst)
{
    set_time(gpstime(day, tst));
}

int main(void)
{
    printf("OwnTracks Prime\r\n");

    GPSI2C gps;
    MDMSerial mdm;

    time_t now = time(NULL);
    lastMin = now;
    lastMax = now;
    lastTime = now;

    blink(3);

    while (!off) {
        if (!mdmInit) {
            blink(1);
            MDMParser::DevStatus devStatus = {};
            mdmInit = mdm.init(SIMPIN, &devStatus);
            mdm.dumpDevStatus(&devStatus, fprintf, stdout);
            snprintf(deviceID, sizeof(deviceID), devStatus.imei);
        }

        if (mdmInit) {
            if (!mdmRegister) {
                blink(2);
                MDMParser::NetStatus netStatus = {};
                mdmRegister = mdm.registerNet(&netStatus, 30000);
                mdm.dumpNetStatus(&netStatus, fprintf, stdout);
            }
        }

        if (mdmRegister) {
            if (!mdmIP) {
                blink(3);
                MDMParser::IP ip = mdm.join(APN,USERNAME,PASSWORD);
                if (ip != NOIP) {
                    mdm.dumpIp(ip, fprintf, stdout);
                    mdmIP = true;
                }
            }
        }

        if (mdmIP) {
            if (!socketConnect) {
                blink(4);

                int rc;
                if (MQTTTLS) {
                    mqttWolf = MQTTwolf();
                    rc = mqttWolf.connect(mqtt_server, mqtt_port);
                } else {
                    mqttSocket = MQTTSocket();
                    rc = mqttSocket.connect(mqtt_server, mqtt_port);
                }

                if (rc != 0) {
                    printf("rc from TCP connect is %d\r\n", rc);
                } else {
                    socketConnect = true;
                }
            }
        }

        if (socketConnect) {
            if (!mqttConnect) {
                blink(5);

                snprintf(pubtopic, sizeof(pubtopic), "%s/%s", BASETOPIC, deviceID);

                char clientID[128];
                char *username = MQTTUSER;
                char *password = MQTTPASS;
                static char *willPayload = "{\"_type\":\"lwt\",\"tst\":0}";
                bool willRetain = false;
                char *willTopic = pubtopic;

                snprintf(clientID, sizeof(clientID), "prime-%s", deviceID);

                MQTTPacket_connectData data = MQTTPacket_connectData_initializer;
                data.MQTTVersion = 3;
                data.clientID.cstring = clientID;
                data.username.cstring = username;
                data.password.cstring = password;
                data.willFlag = true;
                data.will.topicName.cstring = willTopic;
                data.will.message.cstring = willPayload;
                data.will.retained = willRetain;
                data.will.qos = 1;

                if (MQTTTLS) {
                    tlsClient = new MQTT::Client<MQTTwolf, Countdown, 256, 5>(mqttWolf);
                } else {
                    client = new MQTT::Client<MQTTSocket, Countdown, 256, 5>(mqttSocket);
                }

                int rc;
                if (MQTTTLS) {
                    rc = tlsClient->connect(data);
                } else {
                    rc = client->connect(data);
                }
                if (rc != 0) {
                    printf("rc from MQTT connect is %d\r\n", rc);
                    if (MQTTTLS) {
                        mqttWolf.disconnect();
                    } else {
                        mqttSocket.disconnect();
                    }
                    socketConnect = false;
                    mqttConnect = false;
                } else {
                    mqttConnect = true;
                    snprintf(pubtopic, sizeof(pubtopic), "%s/%s/start", BASETOPIC, deviceID);
                    snprintf(payload, sizeof(payload), "%s %s %d", deviceID, VERSION, time(NULL));
                    if (MQTTTLS) {
                        rc = tlsClient->publish(pubtopic, payload, strlen(payload), MQTT::QOS1, true);
                    } else {
                        rc = client->publish(pubtopic, payload, strlen(payload), MQTT::QOS1, true);
                    }

                    if (rc != 0) {
                        printf("rc from MQTT publish is %d\r\n", rc);
                    }

                    snprintf(subtopic, sizeof(subtopic), "%s/%s/cmd", BASETOPIC, deviceID);
                    if (MQTTTLS) {
                        rc = tlsClient->subscribe(subtopic, MQTT::QOS1, &messageArrived);
                    } else {
                        rc = client->subscribe(subtopic, MQTT::QOS1, &messageArrived);
                    }
                    if (rc != 0) {
                        printf("rc from MQTT publish is %d\r\n", rc);
                    }
                }
            }
        }
        
        if (mqttConnect) {
            if (MQTTTLS) {
                tlsClient->yield();
            } else {
                client->yield();
            }
        }

        int ret;
        int count;
        char buf[128];
        while ((ret = gps.getMessage(buf, sizeof(buf))) > 0 && !off) {
            myled = (count++) % 2;
            int len = LENGTH(ret);
            //printf("NMEA: %.*s\r\n", len-2, buf);
            if ((PROTOCOL(ret) == GPSParser::NMEA) && (len > 6)) {
                // talker is $GA=Galileo $GB=Beidou $GL=Glonass $GN=Combined $GP=GPS
                if ((buf[0] == '$') || buf[1] == 'G') {
#define _CHECK_TALKER(s) ((buf[3] == s[0]) && (buf[4] == s[1]) && (buf[5] == s[2]))

                    if (_CHECK_TALKER("GGA") || _CHECK_TALKER("GNS") ) {
                        if (gps.getNmeaItem(9,buf,len,alt)) { // altitude msl [m]
                            printf("GPS Altitude: %.1f\r\n", alt);
                        }

                    } else if (_CHECK_TALKER("RMC")) {

                        char ch;
                        if (gps.getNmeaAngle(3,buf,len,la) &&
                                gps.getNmeaAngle(5,buf,len,lo) &&
                                gps.getNmeaItem(7,buf,len,vel) &&
                                (gps.getNmeaItem(8,buf,len,cog) || 1) &&
                                gps.getNmeaItem(1,buf,len,tst) &&
                                gps.getNmeaItem(9,buf,len,day, 10) &&
                                gps.getNmeaItem(2,buf,len,ch) && ch == 'A'
                           ) {

                            if (setTime) {
                                printf("GPS time: %f, %d, = %f\r\n", tst, day, gpstime(day, tst));
                                gpstime_set(day, tst);
                                setTime = false;
                            }

                            double dist = distanceBetween(lastLa, lastLo, la, lo);

                            if (dist > MINDIST) {
                                sendDist = true;
                            }

                            char type;

                            if ((sendMin && sendDist) || sendMax || sendOnce) {
                                if (sendMax) {
                                    type = 'T';
                                } else if (sendOnce) {
                                    type = 'm';
                                } else {
                                    type = 't';
                                }

                                snprintf(payload, sizeof(payload),
                                         "{"
                                         "\"_type\":\"location\","
                                         "\"tst\":%.0f,"
                                         "\"t\":\"%c\","
                                         "\"lat\":%.6f,"
                                         "\"lon\":%.6f,"
                                         "\"alt\":%.1f,"
                                         "\"cog\":%.1f,"
                                         "\"vel\":%.1f"
                                         "}",
                                         gpstime(day, tst), type, la, lo, alt, cog, vel / 0.539956803456);
                                printf("%s\r\n", payload);
                                if (mqttConnect) {
                                    int rc;
                                    snprintf(pubtopic, sizeof(pubtopic), "%s/%s", BASETOPIC, deviceID);
                                    if (MQTTTLS) {
                                        rc = tlsClient->publish(pubtopic, payload, strlen(payload), MQTT::QOS1, true);
                                    } else {
                                        rc = client->publish(pubtopic, payload, strlen(payload), MQTT::QOS1, true);
                                    }

                                    if (rc != 0) {
                                        printf("rc from MQTT publish is %d\r\n", rc);
                                    }
                                }
                                sendMin = false;
                                sendMax = false;
                                sendDist = false;
                                lastLa = la;
                                lastLo = lo;
                                sendOnce = false;
                            }
                        }
                    } else if (_CHECK_TALKER("GGA") || _CHECK_TALKER("GNS") ) {
                        if (gps.getNmeaItem(9,buf,len,alt)) { // altitude msl [m]
                            //printf("GPS Altitude: %.1f\r\n", a);
                        }
                    }

                    if (mqttConnect) {
                        if (MQTTTLS) {
                            tlsClient->yield(10L);
                        } else {
                            client->yield(10L);
                        }
                    }

                    bool connected;
                    if (MQTTTLS) {
                        connected = tlsClient->isConnected();
                    } else {
                        connected = client->isConnected();
                    }

                    if (!connected) {
                        mqttConnect = false;

                        if (MQTTTLS) {
                            mqttWolf.disconnect();
                        } else {
                            mqttSocket.disconnect();
                        }

                        socketConnect = false;
                        mdm.disconnect();
                        mdmIP = false;
                        mdmRegister = false;
                    }

                    /*
                    *   Checking Timers
                    */
                    time_t now = time(NULL);
                    if (now - lastMin > MININTERVAL) {
                        sendMin = true;
                        lastMin = now;
                    }
                    if (now - lastMax > MAXINTERVAL) {
                        sendMax = true;
                        lastMax = now;
                    }
                    if (now - lastTime > 24*60*60) {
                        setTime = true;
                        lastTime = now;
                    }
                }
            }
        }
    }


    if (mqttConnect) {
        if (MQTTTLS) {
            tlsClient->disconnect();
        } else {
            client->disconnect();
        }
        mqttConnect = false;
    }

    if (socketConnect) {
        if (MQTTTLS) {
            mqttWolf.disconnect();
        } else {
            mqttSocket.disconnect();
        }

        socketConnect = false;
    }

    if (mdmIP) {
        mdm.disconnect();
        mdmIP = false;
    }
    mdm.powerOff();
    mdmRegister = false;
    mdmInit = false;
    gps.powerOff();

    if (reset) {
        NVIC_SystemReset();
    }

    return 0;
}