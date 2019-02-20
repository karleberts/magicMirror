
#Magic Mirror
A twist on the magic mirror projects I've seen, with a camera installed so the UI only displays when a person walks in front of the mirror. Knowing when someone's in front of it also makes silly things possible like [halloween mode](https://gfycat.com/ringeddetailedjerboa) :)
![demo](https://giant.gfycat.com/OptimalArtisticAmmonite.gif)

###First
OpenCV is required in order for the face detection to work. I followed [this guide](https://www.pyimagesearch.com/2016/04/18/install-guide-raspberry-pi-3-raspbian-jessie-opencv-3/) to compile it myself, but you can also find precompiled binaries [like this one](https://github.com/jabelone/OpenCV-for-Pi).

You'll also need API keys to get the weather and calendar displays working.
* [the docs for the google api lib have a section on authentication](https://github.com/googleapis/google-api-nodejs-client#oauth2-client)
* [darksky.net allows 1k calls per day to their api for free](https://darksky.net/dev)

###Building the client app
* The build requires a certain directory structure, run `setup.sh` in the root directory to move the files around and clone the other required repository. After the script runs you'll be left with a root directory containing `config.json`, `package.json` files, as well as folders `mirror` and `event-bus`. 
* Copy the API keys mentioned above into `config.json`
* Run `yarn` in the root directory to install the dependencies.
* `cd mirror && yarn run webpack` will build the client app to the `mirror/services/ui/public` directory


###Pi setup
* Either build OpenCV or install the binaries
* Install python & the necessary packages (`pip install -r pip.txt`)
* Install other necessary packages: `sudo apt-get install node firefox-esr xdotool`
* Connect to pi over ssh, from the pi user's home directory: `mkdir src && mkdir src/magicmirror`
* SCP the contents of the `mirror` directory to the pi's `/home/pi/src/magicmirror` directory
* Install the systemd service to run the mirror:  `sudo cp /home/pi/src/magicmirror/scripts/magicMirror.service /etc/systemd/system`
* Reboot
* You should see the pi boot to the desktop, then after a minute a firefox should open up, navigate to the mirror app, and fullscreen itself. If you step away from the camera for ~10s, then back into view you should see the UI fade into view.
