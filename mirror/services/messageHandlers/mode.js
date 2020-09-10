'use strict';
const { request, requests, sendMessage, } = require('event-bus/client');

const { sleepHdmi, wakeHdmi } = require('../../lib/hdmi');

const state = {
	mode: 'auto',
	data: null,
};

function auto () {
	console.log('auto');
	state.mode = 'auto';
	wakeHdmi();
	request('magicMirror.ui', 'ui.setMode', 'auto');
	request('faceDetect', 'faceDetect.pause', false);
	sendMessage('ui.modeChanged', 'auto');
}

function hide () {
	console.log('hiding');
	state.mode = 'hidden';
	sleepHdmi();
	request('magicMirror.ui', 'ui.setMode', 'hidden');
	request('faceDetect', 'faceDetect.pause', true);
	sendMessage('ui.modeChanged', 'hidden');
}

function show () {
	console.log('showing');
	state.mode = 'visible';
	wakeHdmi();
	request('magicMirror.ui', 'ui.setMode', 'visible');
	request('faceDetect', 'faceDetect.pause', true);
	sendMessage('ui.modeChanged', 'visible');
}

function painting () {
	state.mode = 'painting';
	wakeHdmi();
	request('magicMirror.ui', 'ui.setMode', 'painting');
	request('faceDetect', 'faceDetect.pause', false);
	sendMessage('ui.modeChanged', 'painting');
}


function pic (data) {
	const { src } = data;
	state.mode = 'picture';
	state.data = data;
	wakeHdmi();
	//TODO- make this work
}


function set (mode, data) {
	console.log('setting mode', arguments);
	if (mode !== state.mode &&
			(!data || JSON.stringify(data) !== JSON.stringify(state.data))) {
		switch (mode) {
		case 'auto':
			return auto();
		case 'visible':
			return show();
		case 'hidden':
			return hide();
		case 'picture':
			return pic(data);
		case 'painting':
			return painting();
		}
	}
}

requests
	.do(req => console.log(req))
	.filter(req => req.topic === 'mode.set')
	.subscribe(req => set(req.params.mode, req.params.data));

requests
	.filter(req => req.topic === 'mode.get')
	.subscribe(req => req.respond(state.mode));
