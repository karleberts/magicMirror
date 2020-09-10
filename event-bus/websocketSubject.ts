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

export interface SocketEvent {
    method: string,
    data: any,
    error?: string,
    from?: string,
    id?: string,
    to?: string,
}

/// when sending a message, we encode it to JSON
/// we can override it in the constructor
interface Serializer {
    (data: any): string
}
let defaultSerializer: Serializer;
defaultSerializer = function (data: any) {
    return JSON.stringify(data);
};

export default class RxWebsocketSubject extends Subject<SocketEvent> {
    serializer: Serializer;
    _buffer: Array<any>;
    _isConnected: boolean;
    connectionObserver: Observer<boolean>;
    connectionStatus: Observable<{}>;
    wsSubjectConfig: WebSocketSubjectConfig<SocketEvent | string>;
    socket: WebSocketSubject<SocketEvent | string>;
    reconnectInterval: number;
    reconnectionObservable: Observable<number>;
    reconnectAttempts: number;
    endpointId: string;
    constructor(
        url: string,
        reconnectInterval = 5000,	/// pause between connections
        reconnectAttempts = 0,	/// number of connection attempts, 0 will try forever
        serializer = defaultSerializer
    ) {
        super();
        this.serializer = serializer;
        this._buffer = [];
        this._isConnected = false;

        /// connection status
        this.connectionStatus = new Observable(
            observer => this.connectionObserver = observer
        ).pipe(
            share(),
            distinctUntilChanged()
        );

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
        this.socket = webSocket(this.wsSubjectConfig);
        this.socket.subscribe(
            (msg: SocketEvent) => {
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
                this.reconnectionObservable = null;
                if (!this.socket) {
                    this.complete();
                    this.connectionObserver.complete();
                }
            });
    }

    /// sending the message
    send (msg: any) {
        if (this._isConnected) {
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
