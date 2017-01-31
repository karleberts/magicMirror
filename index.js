'use strict';
const cp = require('child_process');
const path = require('path');
const Promise = require('bluebird');
const process = require('process');

const config = require('./config.json');
const eventBus = require('./services/eventBus/client');
const serviceUtils = require('./services');

const servicesDir = path.join(__dirname, 'services');
const paths = {
	python: path.resolve(__dirname, '..', '..', '.virtualenvs', 'cv', 'bin', 'python'),
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
	opts: {
		cwd: path.dirname(paths.services.faceDetection.main),
		stdio: 'inherit',
		env: {DISPLAY: ':0.0'}
	},
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

function startListeners () {
	// message
}

function startServices () {
	console.log('starting the services');
	return Promise.all(services.map(serviceUtils.start));
}

let chromium;
function startChromium () {
	console.log('starting chromium');
	if (chromium) {
		console.log('already running, forcing a refresh');
		//already started, we can just refresh and be done
		cp.exec(`/bin/sh ${path.resolve(__dirname, 'scripts', 'refreshChromium.sh')}`);
	} else {
		//we need to launch the browser
		const uri = `http://${config.uiHostname}:${config.ports.ui}`;
		const cmd = '/usr/bin/chromium-browser';
		const args = [
			'--incognito',
			'--noerrdialogs',
			'--disable-session-crashed-bubble',
			'--disable-infobars',
			// '--auto-open-devtools-for-tabs',
			//'--remote-debugging-port=9222',
			'--kiosk',
			'--no-first-run',
			uri,
		];
		console.log(cmd, args);
		chromium = cp.spawn(cmd, args, {
			stdio: 'inherit',
			env: {DISPLAY: ':0.0'}
		});
	}
	
}

function start () {
	services.forEach(serviceUtils.stop);
	startEventBus()
		.then(connectEventBus)
		//.then(startListeners)
		.then(startServices)
		.then(startChromium)
		.catch(err => console.error(err));
}

process.on('SIGTERM', () => {
	console.log('got kill signal, shutting down');
	services.forEach(serviceUtils.stop);
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
