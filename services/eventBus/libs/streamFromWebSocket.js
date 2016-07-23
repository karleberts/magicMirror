'use strict';
const Rx = require('rxjs');

const getWebsocket = function () {
	try {
		return (window && window.WebSocket);
	} catch (e) {
		return require('ws');
	}
};

//Open a socket connection to the provided URI
//adapted from rx-dom in order to allow using 'ws' as the socket API (for node)
//instead of the browser WebSocket API (rx-dom only works w/ browser native API)
module.exports = function fromWebsocket(url, protocol, openObserver, closingObserver) {
	const WebSocket = getWebsocket();
	if (!WebSocket) {
		throw new TypeError('WebSocket not implemented in your runtime.');
	}

	let socket;

	function socketClose(code, reason) {
		if (socket) {
			if (closingObserver) {
				closingObserver.next();
				closingObserver.complete();
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
			openObserver.next(e);
			openObserver.complete();
			socket.removeEventListener('open', openHandler, false);
		}

		function messageHandler(e) {
			obs.next(e);
		}

		function errHandler(e) {
			obs.error(e);
		}

		function closeHandler(e) {
			if (e.code !== 1000 || !e.wasClean) {
				return obs.error(e);
			}
			obs.complete();
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

	let observer = Rx.Subscriber.create(
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
};
