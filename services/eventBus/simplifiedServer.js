"use strict";
const config = require('../../config.json');
const PORT = config.ports.eventBus;

const url = require('url');
const querystring = require('querystring');
const Rx = require('rx');
const R = require('ramda');
//stream of 'message' type messages
const messageBus = new Rx.Subject();

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({'port' : PORT});

function notifyReceived (ws, method, id) {
	console.log('sending notify over ws', method);
	ws.send(JSON.stringify({
		'method' : method,
		'id' : id
	}))
}

function getEndpointIdFromConnection (ws) {
	let query = url.parse(ws.upgradeReq.url).query || '';
	query = querystring.parse(query);
	if (!query || !query.endpointId) {
		throw new Error('No endpoint', query);
	}
	return query.endpointId;
}

const connectionStream = Rx.Observable.fromEvent(wss, 'connection');

connectionStream.subscribe(ws => {
	let endpointId = getEndpointIdFromConnection(ws);
	//can dispose of the underlying streams on disconnect by doing something
	//in this stream's subscription? (not sure if necessary)
	let disconnectionStream  = Rx.Observable.fromEvent(ws, 'close');

	let messageStream = messageBus
		.takeUntil(disconnectionStream)
		.share();

	/**
	 * Stream of all incoming socket messages
	 */
	let socketMessages = Rx.Observable.fromEvent(ws, 'message')
		.map(msg => {
			return JSON.parse(msg)
		})
		.takeUntil(disconnectionStream)
		.share();

	/**
	 * rebroadcast regular messages to all subscribed parties
	 * e.g. {method: 'message', data: {message: {foo: 'bar}}}
	 */
	socketMessages
		.filter(msg => {
			let sharedMessageTypes = [
				'message',
				'request',
				'request.response'
			];
			return R.contains(msg.method, sharedMessageTypes);
		})
		.subscribe(msg => {
			messageBus.onNext({
				'method' : msg.method,
				'id' : msg.id,
				'to' : msg.to,
				'from' : endpointId,
				'data' : msg.data
			});
		});

	/**
	 * Handle subscription requests
	 * e.g. {method: 'subscribe', data: {topic: 'foo'}}
	 * Notifies the subscriber of the subscription reception
	 */
	let subscriptionStream = socketMessages
		.filter(msg => msg.method === 'subscribe')
		.map(evt  => ({
			'type': 'subscribe',
			'topic': evt.data.topic,
			'id': evt.id
		}))
		.do(req => notifyReceived(ws, 'subscription.received', req.id));

	let unsubStream = socketMessages
		.filter(msg => msg.method === 'unsubscribe')
		.map(evt => ({
			'type' : 'unsubscribe',
			'topic' : evt.data.topic,
			'id' : evt.id
		}))
		.do(req => notifyReceived(ws, 'unsubscribe.response', req.id));

	//build a stream from subscriptionStream, removing topics when an 'unsub' message is received
	let aggregateSubscriptionStream = subscriptionStream
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
	let subscribedMessageStream = messageStream
		.filter(msg => msg.method === 'message')
		.withLatestFrom(
			aggregateSubscriptionStream,
			(message, subscriptions) => ({
				'message' :message,
				'subscriptions' : subscriptions
			})
		)
		.filter(p => {
			let message = p.message;
			let subscriptions = p.subscriptions;
			return (message.from !== ws &&
					(!message.to || message.to === endpointId) &&
					subscriptions[message.data.topic]);
		})
		.map(evt => (evt.message));

	//Stream of all 'request' messages from any socket
	//filter out any not designated for this endpoint
	let requestsForEndpointStream = messageStream
		.filter(msg => (msg.method === 'request' && msg.to === endpointId));


	/**
	 * Route request.response messages to this endpoint
	 * client can filter valid req ids
	 */
	let requestResponseStream = messageStream
		.filter(msg => (msg.method === 'request.response' &&
				msg.to === endpointId));

	/**
	 * Merge all the message streams the client needs to receive
	 * @type {T|Rx.Observable<T>}
	 */
	let outgoingMessageStream = Rx.Observable
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
