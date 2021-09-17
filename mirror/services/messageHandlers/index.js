'use strict';
const client = require('../../lib/eventBusClient').getClient();
const { filter } = require('rxjs/operators');

require('./hdmi');
require('./mode');

client.request$
    .pipe(
        filter(req => req.topic === 'magicMirror.restart' && !req.params)
    )
	.subscribe(() => process.kill(process.pid, 'SIGTERM'));
