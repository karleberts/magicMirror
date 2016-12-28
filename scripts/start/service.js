'use strict';
const cp = require('child_process');

const eventBus = require('../../services/eventBus/client');

function restart (service) {
	try {
		service.child.kill();
	} catch (e) {
		console.error(e);
	}
	delete service.child;
	return startService(service);
}

function startService (service) {
	const {
		args,
		child,
		cmd,
		endpointId,
		jsFile,
	} = service;
	if (child) { child.kill(); }
	return new Promise((resolve, reject) => {
		eventBus.subscribe(`${endpointId}.ready`)
			.take(1)
			.subscribe(
				() => resolve(),
				e => reject(e)
			);
			
		if (jsFile) {
			service.child = cp.fork(jsFile, args);
		} else {
			service.child = cp.spawn(cmd, args);
		}
		service.child.on('exit', () => restart(service));
	});
}

module.exports = {
	restart,
	start: startService,
};