'use strict';
const Rx = require('rxjs');

const WebSocketCtor = (WebSocket || (window && window.WebSocket)) || require('ws');

/// by default, when a message is received from the server, we are trying to decode it as JSON
/// we can override it in the constructor
function defaultResultSelector (e) {
	return JSON.parse(e.data);
}

/// when sending a message, we encode it to JSON
/// we can override it in the constructor
function defaultSerializer (data) {
	return JSON.stringify(data);
}

module.exports = class RxWebsocketSubject extends Rx.Subject {
	constructor(
		url,
		reconnectInterval = 5000,	/// pause between connections
		reconnectAttempts = 0,	/// number of connection attempts, 0 will try forever
		resultSelector = defaultResultSelector,
		serializer = defaultSerializer
	) {
		super();
		this.resultSelector = resultSelector;
		this.serializer = serializer;
		this._buffer = [];
		this._isConnected = false;

		/// connection status
		this.connectionStatus = new Rx.Observable(observer => this.connectionObserver = observer)
			.share()
			.distinctUntilChanged();

		/// config for WebSocketSubject
		/// except the url, here is closeObserver and openObserver to update connection status
		this.wsSubjectConfig = {
			url,
			WebSocketCtor: WebSocketCtor,
			closeObserver: {
				next: () => {
					this.socket = null;
					this._isConnected = false;
					this.connectionObserver.next(false);
				}
			},
			openObserver: {
				next: () => {
					this._isConnected = true;
					this.connectionObserver.next(true);
					setTimeout(this._flushBuffer.bind(this), 1000);
				}
			}
		};
		/// we connect
		this.connect();
		/// we follow the connection status and run the reconnect while losing the connection
		this.connectionStatus.subscribe(isConnected => {
			if (!this.reconnectionObservable && typeof isConnected == "boolean" && !isConnected) {
				this.reconnect();
			}
		});
	}

	connect() {
		this.socket = Rx.Observable.webSocket(this.wsSubjectConfig);
		this.socket.subscribe(
			msg => {
				this.next(msg); /// when receiving a message, we just send it to our Subject
			},
			error => {
				console.error(error);
				if (!this.socket) {
					/// in case of an error with a loss of connection, we restore it
					this.reconnect();
				}
			});
	}

	/// reconnection
	reconnect () {
		this.reconnectionObservable = Rx.Observable.interval(this.reconnectInterval)
			.takeWhile((v, index) => {
				if (this.socket) { return false; }
				return this.reconnectAttempts === 0 || index < this.reconnectAttempts;
			});
		this.reconnectionObservable.subscribe(
			() => this.connect(),
			null,
			() => {
				/// if the reconnection attempts are failed, then we call complete of our Subject and status
				this.reconnectionObservable = null;
				if (!this.socket) {
					this.complete();
					this.connectionObserver.complete();
				}
			});
	}

	/// sending the message
	send (msg) {
		if (this._isConnected) {
			this.socket.next(this.serializer(msg));
		} else {
			this._buffer.push(msg);
		}
	}

	//called when reconnected
	_flushBuffer () {
		if (this._buffer.length) {
			this._buffer.forEach(msg => this.send(msg));
			this._buffer = [];
		}
	}
};
