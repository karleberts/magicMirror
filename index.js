'use strict';
const cp = require('child_process');
const path = require('path');
const Promise = require('bluebird');
const process = require('process');

const config = require('./config.json');
const eventBus = {
	client: require('./lib/eventBus/client'),
	server: require('./lib/eventBus/server'),
};
const serviceUtils = require('./services');
const updateCloudflare = require('./lib/cloudflareUpdater');

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

function startEventBus () {
	console.log('starting the event bus');
	return eventBus.server.createServer();
}

function connectEventBus () {
	console.log('connecting eventBus');
	return eventBus.client.connect('magicMirror');
}

function startListeners () {
	require('./services/messageHandlers');
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

function updateDynamicDns () {
	Promise.resolve(updateCloudflare())
		.finally(() => setTimeout(updateDynamicDns, (1000 * 60 * 10))); //do this every 10 min
}

function start () {
	services.forEach(serviceUtils.stop);
	startEventBus();
	connectEventBus();
	startListeners();
	startServices()
		.then(() => startChromium());
	updateDynamicDns();
}

process.on('SIGTERM', () => {
	console.log('got kill signal, shutting down');
	services.forEach(serviceUtils.stop);
	if (chromium) {
		chromium.kill();
	}
	process.exit();
});

start();
