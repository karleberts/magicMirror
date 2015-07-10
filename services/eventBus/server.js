"use strict";
let config = require('../../config.json');
const PORT = config.ports.eventBus;
let endpoints = {};

let memwatch = require('memwatch-next');
memwatch.on('leak', function(info) {
	console.log(info);
});

let url = require('url');
let querystring = require('querystring');
let Rx = require('rx');
//stream of 'message' type messages
let messageStream = new Rx.Subject();
//stream of responses to request messages
let responseStream = new Rx.Subject();

let WebSocketServer = require('ws').Server;
let wss = new WebSocketServer({'port' : PORT});

wss.on('connection', function (url, qs, ws) {
	let query = url.parse(ws.upgradeReq.url).query || '';
	query = qs.parse(query);
	if (!query ||
			!query.endpointId ||
			endpoints[query.endpointId]) {
		throw new Error('No endpoint or endpoint exists', query);
	}
	//save a reference to this socket in the endpoint id map
	//requests/responses can specify an endpoint in order to message directly to that socket
	endpoints[query.endpointId] = ws;
	let endpointId = query.endpointId;
	let socketMessages = Rx.Observable.fromEvent(ws, 'message')
		.map(function (msg) {
			return JSON.parse(msg);
		});
	let subscriptions = [];

	//clean up on ws disconnect
	Rx.Observable.fromEvent(ws, 'close')
		.subscribe(Rx.Observer.create(function () {
			delete endpoints[query.endpointId];
			subscriptions.forEach(function (sub) {
				sub.dispose();
			});
		}));

	/**
	 * handle 'subscribe' messages
	 * e.g. {method: 'subscribe', data: {topic: 'foo'}}
	 */
	let subscriptionObserver = Rx.Observer
		.create(function (subscriptionRequest) {
			let messageSubscription = messageStream
				.filter(function (message) {
					//TODO- filter my own messages
					return (message.topic === subscriptionRequest.topic);
					return ((message.from !== ws) &&
							(message.topic === subscriptionRequest.topic));
				})
				.subscribe(Rx.Observer.create(
					function (message) {
						if (message.to && message.to !== endpointId) {
							//message is intended for another endpoint
							return;
						}
						ws.send(JSON.stringify({
							'method' : 'message',
							'data' : {
								'topic': message.topic,
								'contents': message.contents
							}
						}));
					}
				));
			subscriptions.push(messageSubscription);
		});

	/**
	 * Handle subscription requests
	 * Notifies the subscriber of the subscription reception and
	 * subscribes to 'messageStream' events with the specified topic
	 */
	socketMessages
		.filter(function (msg) {
			return (msg.method === 'subscribe');
		})
		.map(function (evt) {
			return {
				'topic' : evt.data.topic,
				'id' : evt.id
			}
		})
		.do(function (subscriptionRequest) {
			ws.send(JSON.stringify({
				'method' : 'subscription.response',
				'id' : subscriptionRequest.id
			}))
		})
		.subscribe(subscriptionObserver);

	/**
	 * rebroadcast regular messages to all subscribed parties
	 * e.g. {method: 'message', data: {message: {foo: 'bar}}}
	 */
	let messageSubscription = socketMessages
		.filter(function (msg) {
			return (msg.method === 'message');
		})
		.subscribe(Rx.Observer.create(function (msg) {
			messageStream.onNext({
				'from' : ws,
				'to' : msg.to,
				'topic' : msg.data.topic,
				'contents' : msg.data.contents
			});
		}));

	/**
	 * route request messages to the specified endpoint and subscribe to a 'response'
	 * requests can have accept only one response
	 */
	let requestSubscription = socketMessages
		.filter(function (msg) {
			return (msg.method === 'request');
		})
		.do(function (request) {
			ws.send(JSON.stringify({
				'method' : 'request.received',
				'id' : request.id
			}))
		})
		.subscribe(Rx.Observer.create(function (msg) {
			//set up a response listener
			//TODO - partially apply the 'from' arg as the current endpoint id
			//responding client should emit {'method' : 'request.response', 'to' : from, 'id' : id} to respond
			let responseSubscription = '';
			//find the target endpoint
			let to = msg.to;
			let ws = endpoints[to];
			if (ws) {
				//send the request to the endpoint
				ws.send(JSON.stringify({
					'method' : 'request',
					'id' : msg.id,
					'from' : endpointId,
					'data' : {
						'topic': msg.data.topic,
						'params': msg.data.params
					}
				}));
			} else {
				//TODO- return an error on the response listener
			}

		}));

	/**
	 * Route request.response messages
	 */
	let responseSubscription = socketMessages
		.filter(function (msg) {
			return (msg.method === 'request.response');
		})
		.subscribe(Rx.Observer.create(function (msg) {
			ws.send(JSON.stringify(msg));
		}));

}.bind(null, url, querystring));
