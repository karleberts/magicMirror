#! /bin/sh
### BEGIN INIT INFO
# Provides:          magicMirror
# Required-Start:    $all
# Required-Stop:     
# Default-Start:     5
# Default-Stop:      0 1 6
# Short-Description: magicMirror
### END INIT INFO

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/opt/bin
DAEMON_PATH="/home/pi/src/magicmirror"
DAEMON="su pi -lc '/home/pi/.nvm/versions/node/v6.6.0/bin/node /home/pi/src/magicmirror/scripts/start.js'"

NAME=magicMirror
PIDFILE=/tmp/$NAME.pid
SCRIPTNAME=/etc/init.d/$NAME



. /lib/init/vars.sh
. /lib/lsb/init-functions
# If you need to source some other scripts, do it here

case "$1" in
  start)
    log_begin_msg "Starting magicMirror: $DAEMON"
	cd $DAEMON_PATH
	$DAEMON > /tmp/magicMirror.log 2>&1
	PID=$!
		if [ -z $PID ]; then
			printf "%s\n" "Fail"
		else
			echo $PID > $PIDFILE
			printf "%s\n" "Ok"
		fi
    log_end_msg $?
    exit 0
;;
status)
	printf "%-50s" "Checking $NAME..."
	if [ -f $PIDFILE ]; then
		PID=`cat $PIDFILE`
		if [ -z "`ps axf | grep ${PID} | grep -v grep`" ]; then
			printf "%s\n" "Process dead but pidfile exists"
		else
			echo "Running"
		fi
	else
		printf "%s\n" "Service not running"
	fi
;;
  stop)
    log_begin_msg "Stopping magicMirror"
	PID=`cat $PIDFILE`
	cd $DAEMON_PATH
	if [ -f $PIDFILE ]; then
		kill -HUP $PID
		printf "%s\n" "Ok"
		rm -f $PIDFILE
	else
		printf "%s\n" "pidfile not found"
	fi
    log_end_msg $?
    exit 0
;;
restart)
	$0 stop
	$0 start
;;
*)
    echo "Usage: /etc/init.d/${NAME} {start|status|stop}"
    exit 1
;;
esac