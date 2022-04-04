'use strict';
const client = require('../../lib/eventBusClient').getClient();
const { sleepHdmi, wakeHdmi } = require('../../lib/hdmi');
const { filter, tap } = require('rxjs/operators');

const state = module.exports.state = {
    mode: 'auto',
    data: null,
};

const modes = module.exports.modes = {
    auto: 'auto',
    hidden: 'hidden',
    visible: 'visible',
    painting: 'painting',
    pic: 'pic',
};

function auto () {
    console.log('auto');
    wakeHdmi();
    client.request('magicMirror.ui', 'ui.setMode', 'auto');
    client.request('faceDetect', 'faceDetect.pause', false);
    client.sendMessage('ui.modeChanged', 'auto');
}

function hide () {
    console.log('hiding');
    sleepHdmi();
    client.request('magicMirror.ui', 'ui.setMode', 'hidden');
    client.request('faceDetect', 'faceDetect.pause', true);
    client.sendMessage('ui.modeChanged', 'hidden');
}

function show () {
    console.log('showing');
    wakeHdmi();
    client.request('magicMirror.ui', 'ui.setMode', 'visible');
    client.request('faceDetect', 'faceDetect.pause', true);
    client.sendMessage('ui.modeChanged', 'visible');
}

function painting () {
    wakeHdmi();
    client.request('magicMirror.ui', 'ui.setMode', 'painting');
    client.request('faceDetect', 'faceDetect.pause', false);
    client.sendMessage('ui.modeChanged', 'painting');
}


function pic (data) {
    wakeHdmi();
    //TODO- make this work
}


function set (mode, data) {
    if (mode !== state.mode &&
            (!data || JSON.stringify(data) !== JSON.stringify(state.data))) {
        switch (mode) {
        case 'auto': auto();
            break;
        case 'visible': show();
            break;
        case 'hidden': hide(data);
            break;
        case 'picture': pic(data);
            break;
        case 'painting': painting();
            break;
        }
        state.mode = mode;
        state.data = data;
    }
}
module.exports.set = set;
module.exports.get = () => state;

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
