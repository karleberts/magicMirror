
to get audio working
- http://blog.nagimov.com/alsa-utils-arecord-bug-lots-of-wav-files-ignoring-duration-parameter/
  - downgrade alsa-utils to pre-1.0.26
  - record w/ arecord -f S16_LE -r 44100 -d 10


config for booting to website
  - http://blogs.wcode.org/2013/09/howto-boot-your-raspberry-pi-into-a-fullscreen-browser-kiosk/


boot script setup
	- copy magicMirror.service to /etc/systemd/system
	- see https://www.axllent.org/docs/view/nodejs-service-with-systemd/
