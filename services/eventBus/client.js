/* @flow weak */
"use strict";
/**
 * Created by Karl on 6/21/2015.
 */
const Rx = require('rx');
const getWebsocket = function () {
	try {
		return (window && window.WebSocket);
	} catch (e) {
		return require('ws');
	}
}
const R = require('ramda');

const config = require('../../config.json');
const PORT = config.ports.eventBus;
const URL = 'ws://localhost:' + PORT + '/';
const eventSource = new Rx.Subject();
let messageId = 0;
let sock;

/**
 * Connect to the server using the specified endpoint id
 * @param {string} endpointId
 * @returns {Promise|any}
 */
function connect (endpointId) {
	return new Promise((resolve, reject) => {
		let url = getUrl(endpointId);
		sock = fromWebsocket(url, null, Rx.Observer.create(() => resolve()));
		sock.endpointId = endpointId;
		sock.subscribe(Rx.Observer.create(
			//try json parsing the event, should always work
			evt => eventSource.onNext(JSON.parse(evt.data)),
			err => { /*reconnect on error*/ },
			() => console.log('disconnected')
		));
	});
}

/**
 * Disconnect a
 */
function disconnect () {
	if (!sock) {
		throw new Error('Not connected');
	}
	sock.onComplete();
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
function subscribe(topic) {
	let id = messageId++;
	sendSocketMessage({
		method: 'subscribe',
		id,
		data: {
			topic: topic
		}
	});
	return eventSource
		.filter(evt => (
			evt.method === 'subscription.response' &&
			evt.id === id
		))
		.take(1)
		//.timeout(10000)
		.flatMap(() => eventSource
			.filter(evt => (evt.method === 'message' &&
				(!topic || evt.topic === topic)
			))
		)
}

function unsubscribe (topic) {
	let id = messageId++;
	sendSocketMessage({
		method: 'unsubscribe',
		id,
		data: {
			topic: topic
		}
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
	let id = messageId++;
	sendSocketMessage({
		to: endpointId,
		method: 'request',
		id,
		data: {topic, params}
	});
	return eventSource
		.filter(evt => (
			evt.method === 'request.received' && evt.id === id
		))
		.take(1)
		.flatMap(() => eventSource
			.filter(evt => evt.method === 'request.response' && evt.from === endpointId && evt.id === id)
		)
		.take(1)
		.map(response => {
			if (response.error) {
				throw new Error(response.error);
			}
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
	sendSocketMessage({
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
	sock.onNext(JSON.stringify(msg))
}

/**
 * listen for requests on the socket
 * Exposed as exports.requests
 */
let requestStream = eventSource
	.filter(evt => (evt.method === 'request'))
	.map(request => ({
		topic: request.data.topic,
		params: request.data.params,
		respond: R.once(R.partial(respond, request.from, request.id))
	}));

/**
 * Added to request notifications as a method with bound params to allow observer methods to
 * Send a reply to a request.
 * @param to - target endpoint id (should be the endpoint that sent the original request)
 * @param id - id of the original request
 * @param [params] - Response data
 */
function respond (to, id, params) {
	sendSocketMessage({
		method : 'request.response',
		to : to,
		id : id,
		data : params
	});
}

module.exports = {
	connect: connect,
	disconnect: disconnect,
	subscribe: subscribe,
	unsubscribe : unsubscribe,
	sendMessage: sendMessage,
	request: request,
	requests : requestStream
};


//Open a socket connection to the provided URI
//adapted from rx-dom in order to allow using 'ws' as the socket API (for node)
//instead of the browser WebSocket API (rx-dom only works w/ browser native API)
function fromWebsocket(url, protocol, openObserver, closingObserver) {
	const WebSocket = getWebsocket();
	if (!WebSocket) {
		throw new TypeError('WebSocket not implemented in your runtime.');
	}

	let socket;

	function socketClose(code, reason) {
		if (socket) {
			if (closingObserver) {
				closingObserver.onNext();
				closingObserver.onCompleted();
			}
			if (!code) {
				socket.close();
			} else {
				socket.close(code, reason);
			}
		}
	}

	let observable = Rx.Observable.create(function (obs) {
		socket = protocol ? new WebSocket(url, protocol) : new WebSocket(url);
		if (!socket.removeEventListener && socket.removeListener) {
			socket.removeEventListener = socket.removeListener;
		}

		function openHandler(e) {
			openObserver.onNext(e);
			openObserver.onCompleted();
			socket.removeEventListener('open', openHandler, false);
		}

		function messageHandler(e) {
			obs.onNext(e);
		}

		function errHandler(e) {
			obs.onError(e);
		}

		function closeHandler(e) {
			if (e.code !== 1000 || !e.wasClean) {
				return obs.onError(e);
			}
			obs.onCompleted();
		}

		openObserver && socket.addEventListener('open', openHandler, false);
		socket.addEventListener('message', messageHandler, false);
		socket.addEventListener('error', errHandler, false);
		socket.addEventListener('close', closeHandler, false);

		return function () {
			socketClose();

			socket.removeEventListener('message', messageHandler, false);
			socket.removeEventListener('error', errHandler, false);
			socket.removeEventListener('close', closeHandler, false);
		};
	});

	let observer = Rx.Observer.create(
		function (data) {
			socket && socket.readyState === WebSocket.prototype.OPEN && socket.send(data);
		},
		function (e) {
			if (!e.code) {
				throw new Error('no code specified. be sure to pass { code: ###, reason: "" } to onError()');
			}
			socketClose(e.code, e.reason || '');
		},
		function () {
			socketClose(1000, '');
		}
	);

	return Rx.Subject.create(observer, observable);
}
