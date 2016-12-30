'use strict';
const cp = require('child_process');
const path = require('path');
const Promise = require('bluebird');
const process = require('process');

const config = require('../config.json');
const eventBus = require('../services/eventBus/client');
const service = require('./start/service');

const servicesDir = path.join(__dirname, '..', 'services');
const paths = {
	python: path.resolve(__dirname, '..', '..', '..', '.virtualenvs', 'cv', 'bin', 'python'),
	services: {
		eventBus: {
			server: path.resolve(servicesDir, 'eventBus', 'server.js'),
			client: path.resolve(servicesDir, 'eventBus', 'client.js'),
		},
		ui: {
			server: path.resolve(servicesDir, 'ui', 'server.js'),
		},
		faceDetection: {
			main: path.resolve(servicesDir, 'faceDetection', 'main.py'),
		},
	},
};

const services = [{
	cmd: paths.python,
	args: [paths.services.faceDetection.main],
	endpointId: 'faceDetect',
	opts: {cwd: path.dirname(paths.services.faceDetection.main)},
}, {
	jsFile: paths.services.ui.server,
	endpointId: 'uiServer',
}];

let eventBusServer;
function startEventBus () {
	console.log('starting the event bus');
	return new Promise((resolve, reject) => {
		try {
			const eventBus = eventBusServer = cp.fork(paths.services.eventBus.server);
			eventBus.on('message', msg => {
				if (msg.ready) {
					resolve();
				}
			});
			//restart errything if the message bus stops
			eventBus.on('exit', start);
		} catch (e) {
			console.error(e);
			reject(e);
		}
	});
}

function connectEventBus () {
	console.log('connecting eventBus');
	return eventBus.connect('magicMirror');
}

function startServices () {
	console.log('starting the services');
	return Promise.all(services.map(service.start));
}

let chromium;
function startChromium () {
	console.log('starting chromium');
	if (chromium) {
		console.log('already running, forcing a refresh');
		//already started, we can just refresh and be done
		cp.exec(`/bin/sh ${path.resolve(__dirname, 'refreshChromium.sh')}`);
	} else {
		//we need to launch the browser
		const uri = `http://${config.uiHostname}:${config.ports.ui}`;
		const args = [
			path.resolve(__dirname, 'start', 'startChromium.sh'),
			'--noerrdialogs',
			'--disable-session-crashed-bubble',
			'--disable-infobars',
			// '--kiosk',
			uri,
		];
		console.log('/bin/sh', args);
		chromium = cp.spawn('/bin/sh', args);
	}
	
}

function start () {
	services.forEach(service.stop);
	startEventBus()
		.then(connectEventBus)
		.then(startServices)
		.then(startChromium)
		.catch(err => console.error(err));
}

process.on('SIGHUP', () => {
	console.log('got SIGHUP, shutting down');
	services.forEach(service.stop);
	if (chromium) {
		chromium.kill();
	}
	if (eventBusServer) {
		eventBusServer.removeAllListeners('exit');
		eventBusServer.kill();
	}
	process.exit();
});

start();