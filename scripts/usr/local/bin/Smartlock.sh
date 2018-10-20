#!/bin/bash
mqtt_server="192.168.177.3"
address="00:1a:22:12:12:12"
key="f98623423423442342342344322"
user_id="3"

/usr/bin/mosquitto_sub -h $mqtt_server -t "Smartlock/action" | /usr/local/bin/keyble-sendcommand  --address $address --user_id $user_id --user_key $key  | /usr/bin/mosquitto_pub -h $mqtt_server -l -r -t "Smartlock/status"
