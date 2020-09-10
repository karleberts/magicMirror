'use strict';


const { requests } = require('event-bus/client');

require('./hdmi');
require('./mode');

requests
	.filter(req => req.topic === 'magicMirror.restart' && !req.params)
	.subscribe(() => process.kill(process.pid, 'SIGTERM'));
