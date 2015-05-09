"use strict";

var Promise = require('bluebird');
var cp = require('child_process');

var CAPTURE_PATH = '/tmp/webcam.png';
function NoFaces () {
}
NoFaces.prototype = Error.prototype;

function captureImage (cb) {
	return new Promise(function (resolve, reject) {
		var imageCap = cp.spawn('imagesnap', ['-w', 1, CAPTURE_PATH]);
		imageCap.on('close', function (code, signal) {
			if (code === 0) {
				resolve();
			} else {
				reject();
			}
		});
	});
}

function findFaces () {
	return new Promise(function (resolve, reject) {
		var faceDetect = cp.spawn('python', ['face_detect.py', CAPTURE_PATH, 'haarcascade_frontalface_default.xml']);
		faceDetect.on('close', function (code, signal) {
			if (code === 0) {
				resolve();
			} else {
				reject(new NoFaces());
			}
		});
	});
}

function checkForFaces () {
	captureImage()
	.then(findFaces)
	.then(function () {
		console.log('found a face!!');
	})
	.catch(function (err) {
		if (err instanceof NoFaces) {
			console.log('did not find a face :(');
		} else {
			console.log('error checking for faces: ', err);
		}
	})
	.finally(function () {
		setTimeout(checkForFaces, 5000);
	});
}
checkForFaces();
