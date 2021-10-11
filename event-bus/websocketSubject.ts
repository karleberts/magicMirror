import { tap } from 'ramda';
import {Subject, Observable, Observer, interval} from 'rxjs';
import {
    distinctUntilChanged,
    share,
    takeWhile,
} from 'rxjs/operators';
import {webSocket, WebSocketSubject, WebSocketSubjectConfig} from "rxjs/webSocket";

interface Window {
    WebSocket: any
}

const WebSocketCtor = (
    (typeof WebSocket !== 'undefined' && WebSocket) ||
    (typeof window !== 'undefined' && window && (<any> window).WebSocket)
) || require('ws');

/// when sending a message, we encode it to JSON
/// we can override it in the constructor
interface Serializer {
    (data: any): string
}

export default class RxWebsocketSubject<T> extends Subject<T> {
	serializer: Serializer = (data: T) => JSON.stringify(data);
	deserializer = (e: MessageEvent) => JSON.parse(e.data);
    _buffer: Array<T>;
    _isConnected: boolean;
    connectionObserver?: Observer<boolean>;
    connectionStatus: Observable<boolean>;
    wsSubjectConfig: WebSocketSubjectConfig<T>;
    socket?: WebSocketSubject<T>;
    reconnectInterval: number;
    reconnectionObservable?: Observable<number>;
    reconnectAttempts: number;
    endpointId?: string;
    constructor(
        url: string,
        reconnectInterval = 5000,	/// pause between connections
        reconnectAttempts = 0,	/// number of connection attempts, 0 will try forever
		WebsocketImpl = WebSocketCtor
    ) {
        super();
		this.reconnectInterval = reconnectInterval;
		this.reconnectAttempts = reconnectAttempts;
        this._buffer = [];
        this._isConnected = false;

        /// connection status
        this.connectionStatus = new Observable<boolean>(
            observer => this.connectionObserver = observer
        ).pipe(
            share(),
            distinctUntilChanged()
        );

        /// config for WebSocketSubject
        /// except the url, here is closeObserver and openObserver to update connection status
        this.wsSubjectConfig = {
            url,
			WebSocketCtor: WebsocketImpl,
			serializer: this.serializer,
			deserializer: this.deserializer,
            closeObserver: {
                next: () => {
                    this.socket = undefined;
                    this._isConnected = false;
                    this.connectionObserver && this.connectionObserver.next(false);
                }
            },
            openObserver: {
                next: () => {
                    this._isConnected = true;
                    this.connectionObserver && this.connectionObserver.next(true);
                    setTimeout(this._flushBuffer.bind(this), 1000);
                }
            }
        };
	}
	
	setSerializer (serializer: Serializer) {
		this.serializer = serializer;
	}

	setDeserializer (deserializer: (e: MessageEvent) => T) {
		this.deserializer = deserializer;
	}

    connect() {
		if (this.socket) { return; }
        this.socket = webSocket(this.wsSubjectConfig);
        this.socket.subscribe(
            (msg: T) => {
                this.next(msg); /// when receiving a message, we just send it to our Subject
            },
            error => {
                console.error(this.wsSubjectConfig.url);
                console.error(error);
                if (!this.socket) {
                    /// in case of an error with a loss of connection, we restore it
                    this.reconnect();
                }
            });
        /// we follow the connection status and run the reconnect while losing the connection
        this.connectionStatus.subscribe(isConnected => {
            if (!this.reconnectionObservable && typeof isConnected == "boolean" && !isConnected) {
                this.reconnect();
            }
        });
    }

    /// reconnection
    reconnect () {
        this.reconnectionObservable = interval(this.reconnectInterval).pipe(
            takeWhile((v, index) => {
                if (this.socket) { return false; }
                return this.reconnectAttempts === 0 || index < this.reconnectAttempts;
            })
        );
        this.reconnectionObservable.subscribe(
            () => this.connect(),
            null,
            () => {
                /// if the reconnection attempts are failed, then we call complete of our Subject and status
                this.reconnectionObservable = undefined;
                if (!this.socket) {
                    this.complete();
                    this.connectionObserver && this.connectionObserver.complete();
                }
            });
    }

    /// sending the message
    send (msg: any) {
        if (this._isConnected && this.socket) {
            this.socket.next(msg);
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
