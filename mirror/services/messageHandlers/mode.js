'use strict';
const client = require('../../lib/eventBusClient').getClient();
const { sleepHdmi, wakeHdmi } = require('../../lib/hdmi');
const { filter, tap } = require('rxjs/operators');

const state = {
	mode: 'auto',
	data: null,
};

function auto () {
	console.log('auto');
	state.mode = 'auto';
	wakeHdmi();
	client.request('magicMirror.ui', 'ui.setMode', 'auto');
	client.request('faceDetect', 'faceDetect.pause', false);
	client.sendMessage('ui.modeChanged', 'auto');
}

function hide () {
	console.log('hiding');
	state.mode = 'hidden';
	sleepHdmi();
	client.request('magicMirror.ui', 'ui.setMode', 'hidden');
	client.request('faceDetect', 'faceDetect.pause', true);
	client.sendMessage('ui.modeChanged', 'hidden');
}

function show () {
	console.log('showing');
	state.mode = 'visible';
	wakeHdmi();
	client.request('magicMirror.ui', 'ui.setMode', 'visible');
	client.request('faceDetect', 'faceDetect.pause', true);
	client.sendMessage('ui.modeChanged', 'visible');
}

function painting () {
	state.mode = 'painting';
	wakeHdmi();
	client.request('magicMirror.ui', 'ui.setMode', 'painting');
	client.request('faceDetect', 'faceDetect.pause', false);
	client.sendMessage('ui.modeChanged', 'painting');
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

client.request$
    .pipe(
        tap(req => console.log(req)),
        filter(req => req.topic === 'mode.set')
    )
	.subscribe(req => set(req.params.mode, req.params.data));

client.request$
    .pipe(
        filter(req => req.topic === 'mode.get')
    )
	.subscribe(req => req.respond(state.mode));
