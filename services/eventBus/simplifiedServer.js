"use strict";
const config = require('../../config.json');
const PORT = config.ports.eventBus;

const url = require('url');
const querystring = require('querystring');
const Rx = require('rxjs');
const R = require('ramda');
//stream of 'message' type messages
const messageBus = new Rx.Subject();

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({'port' : PORT});

function notifyReceived (ws, method, id) {
	console.log('sending notify over ws', method);
	ws.send(JSON.stringify({method, id}));
}

function getEndpointIdFromConnection (ws) {
	const query = querystring.parse(url.parse(ws.upgradeReq.url).query || '');
	if (!query || !query.endpointId) {
		throw new Error('No endpoint', query);
	}
	return query.endpointId;
}

const connectionStream = Rx.Observable.fromEvent(wss, 'connection');

connectionStream.subscribe(ws => {
	const endpointId = getEndpointIdFromConnection(ws);
	//can dispose of the underlying streams on disconnect by doing something
	//in this stream's subscription? (not sure if necessary)
	const disconnectionStream  = Rx.Observable.fromEvent(ws, 'close');

	const messageStream = messageBus
		.takeUntil(disconnectionStream)
		.share();

	/**
	 * Stream of all incoming socket messages
	 */
	const socketMessages = Rx.Observable.fromEvent(ws, 'message')
		.map(msg => JSON.parse(msg))
		.takeUntil(disconnectionStream)
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
		.do(req => notifyReceived(ws, 'subscription.received', req.id));

	const unsubStream = socketMessages
		.filter(msg => msg.method === 'unsubscribe')
		.map(evt => ({
			type: 'unsubscribe',
			topic: evt.data.topic,
			id: evt.id
		}))
		.do(req => notifyReceived(ws, 'unsubscribe.response', req.id));

	//build a stream from subscriptionStream, removing topics when an 'unsub' message is received
	const aggregateSubscriptionStream = subscriptionStream
		.merge(unsubStream)
		.scan((subscriptions, req) => {
			console.log('adding a subscription');
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
			(message, subscriptions) => ({message, subscriptions}))
		.filter(p => {
			const { message, subscriptions } = p;
			return (message.from !== ws &&
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
		console.log(msg);
		ws.send(JSON.stringify(msg));
	});
});
