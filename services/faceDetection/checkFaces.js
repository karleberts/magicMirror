"use strict";

const cp = require('child_process');
var path = require('path');
const Promise = require('bluebird');
const Rx = require('rx');

const eventBus = require('../eventBus/client');

const config = require('../../config.json');
//TODO- make ramdisk on startup...or verify tor whatev
const CAPTURE_PATH = '/Volumes/RAM Disk/snapshot.jpg';
const SLEEP_AFTER_FACE = config.faceDetect.sleep_after_face * 1000;
const FACE_CHECK_INTVL = config.faceDetect.face_check_interval * 1000;
function NoFaces () {
}
NoFaces.prototype = Error.prototype;

function captureImage (cb) {
	return new Promise((resolve, reject) => {
		let imageCap = cp.spawn('imagesnap', ['-w', 1.5, CAPTURE_PATH]);
		imageCap.on('close', (code, signal) => {
			if (code === 0) {
				resolve();
			} else {
				reject();
			}
		});
	});
}

function findFaces () {
	return new Promise((resolve, reject) => {
		let faceDetect = cp.spawn('python', [
			__dirname + path.sep + 'face_detect.py',
			CAPTURE_PATH,
			__dirname + path.sep + 'haarcascade_frontalface_default.xml'
		]);
		faceDetect.on('close', (code, signal) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new NoFaces());
			}
		});
	});
}

function start () {
	captureImage()
		.then(findFaces)
		.then(() => {
			eventBus.sendMessage('faceDetect.result', true);
			//if a face was found we can sleep for a while
			//TODO - make this something like 2 minutes
			setTimeout(start, SLEEP_AFTER_FACE);
		})
		.catch((err) => {
			if (err instanceof NoFaces) {
				console.log('did not find a face :(');
			} else {
				console.log('error checking for faces: ', err);
			}
			//no face was found, check again in 5 secs
			eventBus.sendMessage('faceDetect.result', false);
			setTimeout(start, FACE_CHECK_INTVL);
		});
}
eventBus.connect('magicMirror.faceDetect')
	.then(start);
