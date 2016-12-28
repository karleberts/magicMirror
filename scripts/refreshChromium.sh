export DISPLAY=:"0.0"
XAUTHORITY=/home/pi/.Xauthority
WID=$(xdotool search --onlyvisible --class chromium|head -1)
xdotool windowactivate ${WID}
xdotool key ctrl+F5