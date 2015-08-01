"use strict";
const config = require('../../config.json');
const PORT = config.ports.eventBus;
let endpoints = {};

const memwatch = require('memwatch-next');
memwatch.on('leak', function(info) {
	console.log(info);
});

const url = require('url');
const querystring = require('querystring');
const Rx = require('rx');
var R = require('ramda');
//stream of 'message' type messages
const messageStream = new Rx.Subject();
//stream of responses to request messages
const responseStream = new Rx.Subject();

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({'port' : PORT});

function onClose (endpointId, subscriptions) {
	delete endpoints[endpointId];
	subscriptions.forEach((sub) => sub.dispose());
}
function getEndpointIdFromConnection (ws) {
	let query = url.parse(ws.upgradeReq.url).query || '';
	query = querystring.parse(query);
	if (!query ||
			!query.endpointId) {
		throw new Error('No endpoint', query);
	}
	return query.endpointId;
}
function addEndpoint (id, ws) {
	if (endpoints[id]) {
		throw new Error('Endpoint exists', id);
	}
	return R.assoc(id, ws, endpoints);
}
function addSubscription (subscriptions, subscriptionRequest) {
	var subs = subscriptions[subscriptionRequest.topic] || [];
	let messageSubscription = messageStream
		.filter((message) => (
			//message.from !== ws &&
			(!message.to || message.to === endpointId) &&
			message.topic === subscriptionRequest.topic
		))
		.subscribe(Rx.Observer.create((message) => {
			ws.send(JSON.stringify({
				'method' : 'message',
				'data' : {
					'topic': message.topic,
					'contents': message.contents
				}
			}));
		}));
	return subs.concat(messageSubscription);
}
function removeSubscription (subscriptions, req) {
	if (subscriptions[req.topic]) {
		subscriptions[req.topic].forEach((stream) => { stream.dispose(); });
	}
	return R.dissoc(req.topic, subscriptions);
}

Rx.Observable.fromEvent(wss, 'connection')
	.subscribe((ws) => {
		let endpointId = getEndpointIdFromConnection(ws);
		//save a reference to this socket in the endpoint id map
		//requests/responses can specify an endpoint in order to message directly to that socket
		endpoints = addEndpoint(endpointId, ws);
		let subscriptions = {};

		//clean up on ws disconnect
		Rx.Observable.fromEvent(ws, 'close')
			.subscribe(() => {
				onClose(endpointId, subscriptions);
			});

		/**
		 * Stream of all incoming socket messages
		 */
		let socketMessages = Rx.Observable.fromEvent(ws, 'message')
			.map((msg) => JSON.parse(msg));

		let subscriptions =

		/**
		 * Handle subscription requests
		 * e.g. {method: 'subscribe', data: {topic: 'foo'}}
		 * Notifies the subscriber of the subscription reception and
		 * subscribes to 'messageStream' events with the specified topic
		 */
		socketMessages
			.filter((msg) => msg.method === 'subscribe')
			.map((evt)  => ({
				'topic' : evt.data.topic,
				'id' : evt.id
			}))
			.do((subscriptionRequest) => {
				subscriptions = addSubscription(subscriptions, subscriptionRequest);
			})
			.subscribe((subscriptionRequest) => {
				ws.send(JSON.stringify({
					'method' : 'subscription.response',
					'id' : subscriptionRequest.id
				}))
			});

		/**
		 * Handle unsubscribe requests
		 */
		socketMessages
			.filter((msg) => msg.method === 'unsubscribe')
			.map((evt)  => ({
				'topic' : evt.data.topic,
				'id' : evt.id
			}))
			.do((req) => {
				subscriptions = removeSubscription(subscriptions, req);
			})
			.subscribe((req) => {
				ws.send(JSON.stringify({
					'method' : 'unsubscribe.response',
					'id' : req.id
				}))
			});

		/**
		 * rebroadcast regular messages to all subscribed parties
		 * e.g. {method: 'message', data: {message: {foo: 'bar}}}
		 */
		let messageSubscription = socketMessages
			.filter((msg) => msg.method === 'message')
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
			.filter((msg) => msg.method === 'request')
			.do((request) => {
				ws.send(JSON.stringify({
					'method' : 'request.received',
					'id' : request.id
				}))
			})
			.subscribe(Rx.Observer.create((msg) => {
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
			.filter((msg) => msg.method === 'request.response')
			.subscribe(Rx.Observer.create((msg) => {
				ws.send(JSON.stringify(msg));
			}));
	});
function onConnect (ws) {

}
