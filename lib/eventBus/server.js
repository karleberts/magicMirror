"use strict";
const fs = require('fs');
const path = require('path');
const process = require('process');
const url = require('url');
const querystring = require('querystring');
const Rx = require('rxjs');
const R = require('ramda');

const config = require('../../config.json');
const PORT = config.ports.eventBus;
const SSL_PORT = config.ports.eventBusSsl;
const privateKey  = fs.readFileSync(path.join(__dirname, '../../certs/eventBus.key'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, '../../certs/eventBus.crt'), 'utf8');
const credentials = {
	key: privateKey,
	cert: certificate
};
const WebSocketServer = require('ws').Server;
const https = require('https');

//stream of 'message' type messages
const messageBus = new Rx.Subject();

function notifyReceived (ws, method, id) {
	ws.send(JSON.stringify({method, id}));
}

function getEndpointIdFromConnection (ws) {
	const query = querystring.parse(url.parse(ws.upgradeReq.url).query || '');
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
	const disconnectionStream  = Rx.Observable.fromEvent(client, 'close');

	const messageStream = messageBus
		.takeUntil(disconnectionStream)
		.share();

	/**
	 * Stream of all incoming socket messages
	 */
	const socketMessages = Rx.Observable
		.fromEvent(client, 'message')
		.map(msg => JSON.parse(msg))
		.takeUntil(disconnectionStream)
		// .do(msg => console.log('incoming msg', msg))
		.share();

	/**
	 * rebroadcast regular messages to all subscribed parties
	 * e.g. {method: 'message', data: {message: {foo: 'bar}}}
	 */
	socketMessages
		.filter(msg => R.contains(msg.method, [
			'message',
			'request',
			'request.response'
		]))
		.subscribe(msg => messageBus.next({
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
	const subscriptionStream = socketMessages
		.filter(msg => msg.method === 'subscribe')
		.map(evt  => ({
			type: 'subscribe',
			topic: evt.data.topic,
			id: evt.id
		}))
		.do(req => notifyReceived(client, 'subscription.received', req.id));

	const unsubStream = socketMessages
		.filter(msg => msg.method === 'unsubscribe')
		.map(evt => ({
			type: 'unsubscribe',
			topic: evt.data.topic,
			id: evt.id
		}))
		.do(req => notifyReceived(client, 'unsubscribe.response', req.id));

	//build a stream from subscriptionStream, removing topics when an 'unsub' message is received
	const aggregateSubscriptionStream = subscriptionStream
		.merge(unsubStream)
		.scan((subscriptions, req) => {
			if (req.type === 'subscribe') {
				subscriptions[req.topic] = true;
			} else {
				delete subscriptions[req.topic];
			}
			return subscriptions;
		}, {});


	//start the outgoing message stream def by getting incoming messages from other sockets
	//with topics to which this socket has subscribed
	const subscribedMessageStream = messageStream
		.filter(msg => msg.method === 'message')
		.withLatestFrom(
			aggregateSubscriptionStream,
			(message, subscriptions) => ({message, subscriptions})
		)
		.filter(p => {
			const { message, subscriptions } = p;
			return (message.from !== client &&
				(!message.to || message.to === endpointId) &&
				subscriptions[message.data.topic]);
		})
		.map(evt => evt.message);

	//Stream of all 'request' messages from any socket
	//filter out any not designated for this endpoint
	const requestsForEndpointStream = messageStream
		.filter(msg => msg.method === 'request' && msg.to === endpointId);


	/**
	 * Route request.response messages to this endpoint
	 * client can filter valid req ids
	 */
	const requestResponseStream = messageStream
		.filter(msg => (msg.method === 'request.response' &&
			msg.to === endpointId));

	/**
	 * Merge all the message streams the client needs to receive
	 * @type {T|Rx.Observable<T>}
	 */
	const outgoingMessageStream = Rx.Observable
		.merge(
			subscribedMessageStream,
			requestsForEndpointStream,
			requestResponseStream
		);

	outgoingMessageStream.subscribe(msg => {
		//send the message over the socket
		client.send(JSON.stringify(msg));
	});
}

function checkAuth (client) {
	return Rx.Observable.fromEvent(client, 'message')
		.take(1)
		.flatMap(data => {
			try {
				const msg = JSON.parse(data);
				console.log(msg);
				if (msg.data.topic === 'auth' &&
						msg.data.contents === config.eventBus.secret) {
					return Rx.Observable.of(client);
				}
			} catch (e) {
			}
			client.close();
			return Rx.Observable.throw(Error('Unable to authenticate'));
		});
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

	return Rx.Observable
		.fromEvent(wss, 'connection')
		.merge(Rx.Observable.fromEvent(ws, 'connection'))
		.flatMap(checkAuth)
		.subscribe(handleConnection);
}

module.exports = {
	createServer,
};
