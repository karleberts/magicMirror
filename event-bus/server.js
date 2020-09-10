const fs = require('fs');
const path = require('path');
// const process = require('process');
const url = require('url');
const querystring = require('querystring');
const R = require('ramda');
const { Subject, fromEvent, merge, of, throwError } = require('rxjs');
const {
	tap,
	filter,
	flatMap,
	map,
	scan,
	share,
	take,
	takeUntil,
	withLatestFrom,
} = require('rxjs/operators');

const config = require('../config.json');
const PORT = config.ports.eventBus;
const SSL_PORT = config.ports.eventBusSsl;
const privateKey  = fs.readFileSync(path.join(__dirname, '../certs/eventBus.key'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, '../certs/eventBus.crt'), 'utf8');
const credentials = {
	key: privateKey,
	cert: certificate
};
const WebSocketServer = require('ws').Server;
const https = require('https');

//stream of 'message' type messages
const messageBus = new Subject();

const disconnect$ = new Subject();

function notifyReceived (ws, method, id) {
	ws.send(JSON.stringify({method, id}));
}

function getEndpointIdFromConnection (ws) {
	const query = querystring.parse(url.parse(ws.reqUrl).query || '');
	if (!query || !query.endpointId) {
		throw new Error('No endpoint', query);
	}
	return query.endpointId;
}


function handleConnection (client) {
	const endpointId = getEndpointIdFromConnection(client);
	console.log(`${endpointId} connected`);
	//can dispose of the underlying streams on disconnect by doing something
	//in this stream's subscription? (not sure if necessary)
	const disconnectionStream  = fromEvent(client, 'close');
	disconnectionStream.subscribe(() => disconnect$.next(endpointId));

	if (endpointId === 'debug') {
		return messageBus.pipe(
			takeUntil(disconnectionStream),
		).subscribe(msg => client.send(JSON.stringify(msg)));
	}

	const messageStream = messageBus.pipe(
		takeUntil(disconnectionStream),
		share()
	);

	/**
	 * Stream of all incoming socket messages
	 */
	const socketMessages = fromEvent(client, 'message').pipe(
		map(msg => JSON.parse(msg.data)),
		takeUntil(disconnectionStream),
		// tap(msg => console.log('incoming msg', msg)),
		share()
	);

	/**
	 * ping/pong for socket keepalive
	 * client pings, server pongs
	 */
	socketMessages.pipe(
		filter(msg => msg.method === 'ping'),
	).subscribe(() => client.send(JSON.stringify({
		method: 'pong'
	})));

	/**
	 * rebroadcast regular messages to all subscribed parties
	 * e.g. {method: 'message', data: {message: {foo: 'bar}}}
	 */
	socketMessages.pipe(
		filter(msg => R.contains(msg.method, [
			'message',
			'request',
			'request.response'
		])),
	).subscribe(msg => messageBus.next({
		method: msg.method,
		id: msg.id,
		to: msg.to,
		from: endpointId,
		data: msg.data
	}));

	/**
	 * Handle subscription requests
	 * e.g. {method: 'subscribe', data: {topic: 'foo'}}
	 * Notifies the subscriber of the subscription reception
	 */
	const subscriptionStream = socketMessages.pipe(
		filter(msg => msg.method === 'subscribe'),
		map(evt  => ({
			type: 'subscribe',
			topic: evt.data.topic,
			id: evt.id
		})),
		tap(req => notifyReceived(client, 'subscription.received', req.id))
	);

	const unsubStream = socketMessages.pipe(
		filter(msg => msg.method === 'unsubscribe'),
		map(evt => ({
			type: 'unsubscribe',
			topic: evt.data.topic,
			id: evt.id
		})),
		tap(req => notifyReceived(client, 'unsubscribe.response', req.id))
	);

	//build a stream from subscriptionStream, removing topics when an 'unsub' message is received
	const aggregateSubscriptionStream = merge(subscriptionStream, unsubStream).pipe(
		scan((subscriptions, req) => {
			if (req.type === 'subscribe') {
				subscriptions[req.topic] = true;
			} else {
				delete subscriptions[req.topic];
			}
			return subscriptions;
		}, {})
	);


	//start the outgoing message stream def by getting incoming messages from other sockets
	//with topics to which this socket has subscribed
	const subscribedMessageStream = messageStream.pipe(
		filter(msg => msg.method === 'message'),
		withLatestFrom(
			aggregateSubscriptionStream,
			(message, subscriptions) => ({message, subscriptions})
		),
		filter(p => {
			const { message, subscriptions } = p;
			return (message.from !== client &&
				(!message.to || message.to === endpointId) &&
				subscriptions[message.data.topic]);
		}),
		map(evt => evt.message)
	);

	//Stream of all 'request' messages from any socket
	//filter out any not designated for this endpoint
	const requestsForEndpointStream = messageStream.pipe(
		filter(msg => msg.method === 'request' && msg.to === endpointId)
	);


	/**
	 * Route request.response messages to this endpoint
	 * client can filter valid req ids
	 */
	const requestResponseStream = messageStream.pipe(
		filter(msg => (msg.method === 'request.response' &&
			msg.to === endpointId))
	);

	/**
	 * Merge all the message streams the client needs to receive
	 * @type {T|Rx.Observable<T>}
	 */
	const outgoingMessageStream = merge(
		subscribedMessageStream,
		requestsForEndpointStream,
		requestResponseStream
	);

	return outgoingMessageStream.subscribe(msg => {
		//send the message over the socket
		client.send(JSON.stringify(msg));
	});
}

function checkAuth ([client, req]) {
	return fromEvent(client, 'message').pipe(
		take(1),
		flatMap(evt => {
			try {
				const msg = JSON.parse(evt.data);
				console.log(msg);
				if (msg.data.topic === 'auth' &&
						msg.data.contents === config.eventBus.secret) {
					client.reqUrl = req.url;
					return of(client);
				}
			} catch (e) {
				console.error('error parsing auth msg data');
			}
			client.close();
			return throwError(Error('Unable to authenticate'));
		})
	);
}

function createServer () {
	const ws = new WebSocketServer({port: PORT});
	const server = https
		.createServer(credentials, (req, res) => {
			res.writeHead(200);
			res.end('hello world\n');
		})
		.listen(SSL_PORT);
	const wss = new WebSocketServer({server});

	//TODO- echo would have to run as child process (client is a singleton)
	// setTimeout(() => {
	// 	require('./echo');
	// 	if (process.send) {
	// 		process.send({ready: true});
	// 	}
	// }, 0);

	return merge(
		fromEvent(wss, 'connection', Array.of),
		fromEvent(ws, 'connection', Array.of)
	).pipe(
		flatMap(checkAuth)
	).subscribe(handleConnection);
}

module.exports = {
	createServer,
	disconnect$,
};
