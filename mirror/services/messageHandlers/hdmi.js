'use strict';
const { requests } = require('event-bus/client');

const { sleepHdmi, wakeHdmi } = require('../../lib/hdmi');


requests
	.filter(req => req.topic === 'hdmi.sleep' && req.params)
	.subscribe(sleepHdmi);
	
requests
	.filter(req => req.topic === 'hdmi.sleep' && !req.params)
	.subscribe(wakeHdmi);
