'use strict';
const cp = require('child_process');
const path = require('path');
const Promise = require('bluebird');
const process = require('process');
const eventBus = {
	client: require('event-bus/client'),
	server: require('event-bus/server'),
};

const config = require('./config.json');
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
	args: ['-u', paths.services.faceDetection.main],
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

let browserInst;
function startBrowser () {
	console.log('starting browser for UI');
	if (browserInst) {
		console.log('already running, forcing a refresh');
		//already started, we can just refresh and be done
		cp.exec(`/bin/sh ${path.resolve(__dirname, 'scripts', 'refreshChromium.sh')}`);
	} else {
		//we need to launch the browser
		const uri = `https://${config.uiHostname}:${config.ports.ui}`;
		// const cmd = '/usr/bin/chromium-browser';
		// const args = [
		// 	'--incognito',
		// 	'--noerrdialogs',
		// 	'--disable-session-crashed-bubble',
		// 	'--disable-infobars',
		// 	// '--auto-open-devtools-for-tabs',
		// 	'--remote-debugging-port=9222',
		// 	'--ignore-certificate-errors',
		// 	'--kiosk',
		// 	'--no-first-run',
		// 	uri,
		// ];

		//a bug with the RPi camera & Chromium's interface w/ UV4L2 cameras
		// (like the rpi cam module, see (https://bugs.chromium.org/p/chromium/issues/detail?id=616007)
		//means we need to use this old version of firefox for now
		//FTR the working firefox version (in this release) is 45.9.0
		const cmd = '/usr/bin/firefox-esr';
		const args = [
			// '-new-window',
			//'--start-debugger-server',
			`${uri}`
		];

		console.log(cmd, args);
		browserInst = cp.spawn(cmd, args, {
			env: {DISPLAY: ':0.0'}
		});
		eventBus.client
			.subscribe('ui.ready')
			.subscribe(() => cp.exec('/usr/bin/xdotool key F11', {env: {DISPLAY: ':0.0'}}));
	}
	
}

function updateDynamicDns () {
	Promise.resolve(updateCloudflare())
		.finally(() => setTimeout(updateDynamicDns, (1000 * 60 * 10))); //do this every 10 min
}

function handleServiceRestartRequest (req) {
}

function listenForServiceRestartRequests () {
	eventBus.client.requests
		.filter(req => req.topic === 'service.restart' &&
				services.filter(s => s.endpointId === req.params.endpointId).length)
		.subscribe(handleServiceRestartRequest);

}

function start () {
	services.forEach(serviceUtils.stop);
	startEventBus();
	connectEventBus();
	startListeners();
	updateDynamicDns();
	startServices()
		.then(() => {
			listenForServiceRestartRequests();
			startBrowser();
		});
}

process.on('SIGTERM', () => {
	console.log('got kill signal, shutting down');
	services.forEach(serviceUtils.stop);
	if (browserInst) {
		browserInst.kill();
	}
	process.exit();
});

start();
