'use strict';
const { request, requests, } = require('event-bus/client');

const { sleepHdmi, wakeHdmi } = require('../../lib/hdmi');

const state = {
	mode: 'auto',
	data: null,
};

function auto () {
	console.log('auto');
	wakeHdmi();
	request('magicMirror.ui', 'ui.setMode', 'auto');
	request('faceDetect', 'faceDetect.pause', false);
}

function hide () {
	console.log('hiding');
	sleepHdmi();
	request('magicMirror.ui', 'ui.setMode', 'hidden');
	request('faceDetect', 'faceDetect.pause', true);
}

function show () {
	console.log('showing');
	wakeHdmi();
	request('magicMirror.ui', 'ui.setMode', 'visible');
	request('faceDetect', 'faceDetect.pause', true);
}

function pic ({src}) {
	wakeHdmi();
	//TODO- make this wor
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
