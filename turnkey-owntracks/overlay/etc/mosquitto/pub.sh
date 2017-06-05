#!/bin/sh

set -e

topic='owntracks/jjolie/nexus7'
tst=`date +%s`

payload='{"tst":"'${tst}'","lat":"48.858334","_type":"location","lon":"2.295134","acc":"141", "batt":"27"}'

mosquitto_pub -t ${topic} -m "${payload}"

