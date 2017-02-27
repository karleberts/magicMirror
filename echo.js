'use strict';


const eventBus = require('./client');

eventBus.connect('echo');
eventBus.requests
	.filter(msg => msg.topic === 'echo')
	.subscribe(msg => {
		msg.respond(msg.params);
	});

/*
Connects to the eventBus server and responds to requests to endpoingId: 'echo'
with a response that contains wjatever was in the original request content
 */
