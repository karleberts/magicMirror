import * as R from 'ramda';
import { tap } from 'ramda';
import { Subject, interval, Observable } from 'rxjs';
import {
    filter,
    flatMap,
    map,
    take,
    timeout,
    withLatestFrom,
    publish,
	takeUntil
} from 'rxjs/operators';

import { SocketEvent } from './types';
import RxWebsocketSubject from './websocketSubject';

export interface Config {
    uiHostname: string,
    eventBus: {
        secret: string,
        useSsl: boolean,
    },
    ports: {
        eventBus: number,
        eventBusSsl: number,
    },
}

export default class EventBusClient {
    private socketEvent$ = new Subject<SocketEvent>();
    private outgoingMessage$ = new Subject<SocketEvent>();
    private messageBuffer = <any[]>[];
    private messageId = 0;
    private sock: RxWebsocketSubject<SocketEvent>;
    private endpointId: string;
    public connectionStatus: Observable<boolean>;
    request$ = this.socketEvent$.pipe(
        filter(evt => (evt.method === 'request')),
        map(request => ({
            topic: request.data.topic,
            params: request.data.params,
            respond: R.once(R.partial(this.respond.bind(this), [request.from, request.id]))
        }))
    );

    constructor (endpointId: string, config: Config) {
            const proto = (config.eventBus.useSsl) ? 'wss' : 'ws';
            const port = (config.eventBus.useSsl) ? config.ports.eventBusSsl : config.ports.eventBus;
            const url = `${proto}://${config.uiHostname}:${port}/?endpointId=${encodeURIComponent(endpointId)}`;
            const sock = this.sock = new RxWebsocketSubject<SocketEvent>(url);
            this.connectionStatus = sock.connectionStatus;
            this.endpointId = endpointId;

            this.outgoingMessage$.subscribe(this.sendSocketMessage.bind(this));
            sock.subscribe(msg => this.socketEvent$.next(msg));
            interval(50000).pipe(
                withLatestFrom(sock.connectionStatus),
                filter(([i, isConnected]) => isConnected)
            ).subscribe(() => this.ping());
            sock.connectionStatus.pipe(
                filter(R.identity)
            ).subscribe((arg) => {
                this.sendMessage('auth', config.eventBus.secret);
                if (this.messageBuffer.length) {
                    this.messageBuffer.forEach(this.sendSocketMessage.bind(this));
                    this.messageBuffer = [];
                }
            })
            sock.connect();
    }

    /**
     * Generate a unique message ID for this endpoint
     */
    private getMessageId () {
        return `${this.endpointId}:${this.messageId++}`;
    }

    /**
     * disconnect from the eventBus and reset
     */
    disconnect () {
        if (!this.sock) { throw new Error('Not connected'); }
        if (this.sock.socket) {
            this.sock.socket.complete();
            this.sock.socket.unsubscribe();
        }
    }

    /**
     * ping the server
     */
    private ping () {
        this.outgoingMessage$.next({
            method: 'ping',
            data: null
        });
    }

    /**
     * Throws an error if not connected
     * @throws Error
     */
    private checkConnection () {
        if (!this.sock || !this.endpointId) { throw Error('Not connected'); }
    }

    /**
     * Send a subscription request for a message topic
     * @param {string} topic - Message topic to subscribe to
     */
    subscribe (topic: string) {
        this.checkConnection();
        const id = this.getMessageId();
        this.outgoingMessage$.next({
            method: 'subscribe',
            id,
            data: {topic}
        });
        return this.socketEvent$.pipe(
            filter(evt => (
                evt.method === 'subscription.received' &&
                evt.id === id
            )),
            take(1),
            flatMap(() => this.socketEvent$.pipe(
                filter(evt => (evt.method === 'message' &&
                    R.path(['data', 'topic'], evt) === topic)
                )
			)),
			takeUntil(this.outgoingMessage$.pipe(
				filter(msg => msg.method === 'unsubscribe' &&
					!!R.path(['data', 'topic'], msg))
			))
        );
    }

    /**
     * unsubscribe from a previously subscribed topic
     * @param {string} topic
     */
    unsubscribe (topic: string) {
        this.checkConnection();
        const id = this.getMessageId();
        this.outgoingMessage$.next({
            method: 'unsubscribe',
            id,
            data: {topic}
        });
        return this.socketEvent$.pipe(
            filter(evt => (
                evt.method === 'unsubscribe.response' &&
                evt.id === id
            )),
            take(1)
        );
    }

    /**
     * Send a request to a specified endpoint
     * @param {string} endpointId - Request recipient's endpoint id (e.g. magicMirror.ui)
     * @param {string} topic - Request identifier
     * @param {object} [params] - Additional request params (some requests may not require params)
     */
    request (endpointId: string, topic: string, params?: any) {
        this.checkConnection();
        const id = this.getMessageId();
        this.outgoingMessage$.next({
            to: endpointId,
            method: 'request',
            id,
            data: {topic, params}
        });
        return this.socketEvent$.pipe(
            filter(evt => evt.method === 'request.response' &&
                evt.from === endpointId && evt.id === id),
            take(1),
            timeout(10000), //dispose of the response stream after 10s?
            map(response => {
                if (response.error) { throw new Error(response.error); }
                return response.data;
            })
        );
    }

    /**
     * @param {string} topic - Message topic id
     * @param {object} message - message payload
     * @param {string} [to] - Optional endpoint id for directed messaging
     */
    sendMessage (topic: string, message: any, to?: string) {
        this.outgoingMessage$.next({
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
    private sendSocketMessage(msg: SocketEvent) {
        if (this.sock) {
            msg = R.merge(msg, {
                from: this.endpointId
            });
            this.sock.send(msg);
        } else {
            this.messageBuffer.push(msg);
        }
    }


    /**
     * Added to request notifications as a method with bound params to allow observer methods to
     * Send a reply to a request.
     * @param to - target endpoint id (should be the endpoint that sent the original request)
     * @param id - id of the original request
     * @param [params] - Response data
     */
    private respond (to: string, id: string, params: any) {
        this.outgoingMessage$.next({
            method : 'request.response',
            to : to,
            id : id,
            data : params
        });
    }
}