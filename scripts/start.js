'use strict';
const cp = require('child_process');
const path = require('path');

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
}, {
	jsFile: paths.services.ui.server,
	endpointId: 'ui',
}];

function startEventBus () {
	return new Promise((resolve, reject) => {
		try {
			const eventBus = cp.fork(paths.services.eventBus.server);
			eventBus.on('message', msg => {
				if (msg.ready) {
					resolve();
				}
			});
			//restart errything if the message bus stops
			eventBus.on('exit', start);
		} catch (e) {
			reject(e);
		}
	});
}

function connectEventBus () {
	return eventBus.connect('magicMirror');
}

function startServices () {
	return Promise.all(services.map(service.start));
}

let chromium;
function startChromium () {
	if (chromium) {
		//already started, we can just refresh and be done
		cp.exec(path.resolve('/usr/bin/sh'), [
			path.resolve(__dirname, 'refreshChromium.sh'),
		]);
	} else {
		//we need to launch the browser
		const browser = path.resolve('/usr/bin/chromium-browser');
		const uri = `http://${config.uiHostname}:${config.ports.ui}`;
		const args = [
			'--noerrdialogs',
			'--disable-session-crashed-bubble',
			'--disable-infobars',
			'--kiosk',
			uri,
		];
		chromium = cp.spawn(browser, args);
	}
	
}

function start () {
	startEventBus()
		.then(connectEventBus)
		.then(startServices)
		.then(startChromium)
		.catch(err => console.error(err));
}

start();


	
