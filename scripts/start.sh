#!/bin/bash
. /home/pi/.nvm/nvm.sh

PID_FILE=/tmp/magicMirror.pid

function clean_up {
	PID=`cat $PID_FILE`
	kill -TERM $PID
}

trap clean_up SIGINT SIGTERM
node index.js &
PID=$!
echo $PID > $PID_FILE
wait $PID
trap - SIGTERM SIGINT
wait $PID
exit
