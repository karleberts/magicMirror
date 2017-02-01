'use strict';
const { execSync } = require('child_process');

const { requests } = require('../../lib/eventBus/client');

function sleepHdmi () {
	execSync('tvservice -o', err => {
		if (err) { throw(err); }
	});
}

function wakeHdmi () {
	execSync('tvservice -o', err => {
		if (err) { throw(err); }
	});
}

requests
	.filter(req => req.topic === 'hdmi.sleep' && req.params)
	.subscribe(sleepHdmi);
	
requests
	.filter(req => req.topic === 'hdmi.sleep' && !req.params)
	.subscribe(wakeHdmi);