'use strict';
const cp = require('child_process');
const { take } = require('rxjs/operators');

function stopService (service) {
	if (!service.child) { return; }
	try {
		service.child.removeAllListeners('exit');
		service.child.kill();
	} catch (e) {
		console.error(e);
	}
	delete service.child;
}

function restart (service) {
	console.log('restarting service', service.endpointId);
	stopService(service);
	return startService(service);
}

function startService (service, client) {
	const {
		args,
		cmd,
		endpointId,
		jsFile,
		opts,
	} = service;
	console.log('starting service', endpointId);
	return new Promise((resolve, reject) => {
		client.subscribe(`${endpointId}.ready`)
            .pipe(
                take(1)
            )
			.subscribe(
				msg => {
					console.log(`${endpointId} started`, msg);
					resolve();
				},
				e => reject(e)
			);
			
		if (jsFile) {
			service.child = cp.fork(jsFile, args, opts);
		} else {
			console.log(cmd, args, opts);
			service.child = cp.spawn(cmd, args, opts);
		}
		service.child.on('exit', () => restart(service));
	});
}

module.exports = {
	restart,
	start: startService,
	stop: stopService,
};
