'use strict';
const client = require('../../lib/eventBusClient').getClient();

const { sleepHdmi, wakeHdmi } = require('../../lib/hdmi');
const { filter } = require('rxjs/operators');


client.request$
    .pipe(
        filter(req => req.topic === 'hdmi.sleep' && req.params)
    )
	.subscribe(sleepHdmi);
	
client.request$
    .pipe(
        filter(req => req.topic === 'hdmi.sleep' && !req.params)
    )
	.subscribe(wakeHdmi);
