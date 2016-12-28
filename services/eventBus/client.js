/* @flow weak */
"use strict";
/**
 * Created by Karl on 6/21/2015.
 */
const Rx = require('rxjs');
const R = require('ramda');

const fromWebsocket = require('./libs/streamFromWebSocket');
const config = require('../../config.json');
const UI_HOSTNAME = config.uiHostname;
const PORT = config.ports.eventBus;
const URL = `ws://${UI_HOSTNAME}:${PORT}/`;
const eventSource = new Rx.Subject();
let messageQueue = new Rx.ReplaySubject();
let messageId = 0;
let sock = null;

/**
 * Generate a unique message ID for this endpoint
 * @param endpointId {string}
 */
function getMessageId (endpointId) {
	return `${endpointId}:${messageId++}`;
}

/**
 * Connect to the server using the specified endpoint id
 * @param {string} endpointId
 * @returns {Promise|any}
 */
function connect (endpointId) {
	return new Promise((resolve, reject) => {
		const url = getUrl(endpointId);
		sock = fromWebsocket(url, null, Rx.Subscriber.create(() => resolve(sock)));
		sock.endpointId = endpointId;
		sock.subscribe(Rx.Subscriber.create(
			//try json parsing the event, should always work
			evt => eventSource.next(JSON.parse(evt.data)),
			err => { reject(err); /*TODO- reconnect on error*/ },
			() => {
				console.log('disconnected');
				messageQueue.complete();
			}
		));
	}).then(sock => {
		messageQueue.subscribe(sendSocketMessage);
		return sock;
	});
}

/**
 * disconnect from the eventBus and reset
 */
function disconnect () {
	if (!sock) { throw new Error('Not connected'); }
	sock.complete();
	sock = null;
	messageQueue.complete();
	messageQueue = new Rx.ReplaySubject();
}

/**
 * Get the full server address given an endpoint id
 * @param endpointId
 * @returns {*}
 */
function getUrl (endpointId) {
	endpointId = encodeURIComponent(endpointId);
	return `${URL}?endpointId=${endpointId}`;
}

/**
 * Send a subscription request for a message topic
 * @param {string} topic - Message topic to subscribe to
 * @returns {Rx.Observable<TResult>} - Stream of messages for the given topic
 */
function subscribe (topic) {
	if (!sock || !sock.endpointId) { throw Error('Not connected'); }
	const id = getMessageId(sock.endpointId);
	messageQueue.next({
		method: 'subscribe',
		id,
		data: {topic}
	});
	return eventSource
		.filter(evt => (
			evt.method === 'subscription.received' &&
			evt.id === id
		))
		.take(1)
		.flatMap(() => eventSource.filter(evt => (evt.method === 'message' &&
			R.path(['data', 'topic'], evt) === topic)
		));
}

/**
 * unsubscribe from a previously subscribed topic
 * @param topic
 * @returns {Observable<T>}
 */
function unsubscribe (topic) {
	if (!sock || !sock.endpointId) { throw Error('Not connected'); }
	const id = getMessageId(sock.endpointId);
	messageQueue.next({
		method: 'unsubscribe',
		id,
		data: {topic}
	});
	return eventSource
		.filter(evt => (
			evt.method === 'unsubscribe.response' &&
			evt.id === id
		))
		.take(1);
}

/**
 * Send a request to a specified endpoint
 * @param {string} endpointId - Request recipient's endpoint id (e.g. magicMirror.ui)
 * @param {string} topic - Request identifier
 * @param {object} [params] - Additional request params (some requests may not require params)
 * @returns {Observable|Rx.Observable<T>} - Response observable
 */
function request (endpointId, topic, params) {
	if (!sock || !sock.endpointId) { throw Error('Not connected'); }
	const id = getMessageId(sock.endpointId);
	messageQueue.next({
		to: endpointId,
		method: 'request',
		id,
		data: {topic, params}
	});
	return eventSource
		.filter(evt => evt.method === 'request.response' &&
				evt.from === endpointId && evt.id === id)
		.take(1)
		.map(response => {
			if (response.error) { throw new Error(response.error); }
			return response.data;
		});
}

/**
 *
 * @param {string} topic - Message topic id
 * @param {object} message - message payload
 * @param {string} [to] - Optional endpoint id for directed messaging
 */
function sendMessage (topic, message, to) {
	messageQueue.next({
		method: 'message',
		to,
		data: {
			topic,
			contents: message
		}
	});
}

/**
 * Internal method for putting data out the socket
 * @param {object} msg - Packet to send over the socket, format should correspond to something the server knows how to interpret'
 */
function sendSocketMessage(msg) {
	msg = R.merge(msg, {
		from: sock.endpointId
	});
	sock.next(JSON.stringify(msg));
}

/**
 * listen for requests on the socket
 * Exposed as exports.requests
 */
const requestStream = eventSource
	.filter(evt => (evt.method === 'request'))
	.map(request => ({
		topic: request.data.topic,
		params: request.data.params,
		respond: R.once(R.partial(respond, [request.from, request.id]))
	}));

/**
 * Added to request notifications as a method with bound params to allow observer methods to
 * Send a reply to a request.
 * @param to - target endpoint id (should be the endpoint that sent the original request)
 * @param id - id of the original request
 * @param [params] - Response data
 */
function respond (to, id, params) {
	messageQueue.next({
		method : 'request.response',
		to : to,
		id : id,
		data : params
	});
}

module.exports = {
	connect,
	disconnect,
	subscribe,
	unsubscribe,
	sendMessage,
	request,
	requests : requestStream
};
