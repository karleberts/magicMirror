import * as R from 'ramda';
import { Observable, Subject, interval } from 'rxjs';
import {
    filter,
    flatMap,
    map,
    take,
    timeout,
    withLatestFrom
} from 'rxjs/operators';

import { SocketEvent } from './types';
import RxWebsocketSubject from './websocketSubject';

export interface Config {
    uiHostname: string,
    eventBus: {
        secret: string,
    },
    ports: {
        eventBus: number,
        eventBusSsl: number,
    },
}

export function createInstance (config: Config) {
    const socketEvent$: Subject<SocketEvent> = new Subject(); //incoming messages
    let outgoingMessage$: Subject<SocketEvent> = new Subject(); //outgoing messages
    outgoingMessage$.subscribe(sendSocketMessage);
    let messageBuffer: Array<any> = [];
    let messageId = 0;
    let sock: RxWebsocketSubject<SocketEvent>|undefined;

    /**
     * Generate a unique message ID for this endpoint
     * @param endpointId {string}
     */
    function getMessageId (endpointId: string) {
        return `${endpointId}:${messageId++}`;
    }

    /**
     * Connect to the server using the specified endpoint id
     */
    function connect (endpointId: string, useSsl = false) {
        return new Promise<RxWebsocketSubject<SocketEvent>>((resolve, reject) => {
            const url = getUrl(endpointId, useSsl);
            sock = new RxWebsocketSubject<SocketEvent>(url);
            sock.endpointId = endpointId;
            sock.subscribe(msg => socketEvent$.next(msg));
            interval(50000).pipe(
                withLatestFrom(sock.connectionStatus)
            ).subscribe(([i, isConnected]) => isConnected && ping());
            sock.connectionStatus.pipe(
                take(1)
            ).subscribe(connectionStatus => {
                if (connectionStatus) {
                    resolve(sock);
                } else {
                    reject(connectionStatus);
                }
            });
        }).then((sock) => {
            sendMessage('auth', config.eventBus.secret);
            if (messageBuffer.length) {
                messageBuffer.forEach(sendSocketMessage);
                messageBuffer = [];
            }
            return sock;
        });
    }

    /**
     * disconnect from the eventBus and reset
     */
    function disconnect () {
        if (!sock) { throw new Error('Not connected'); }
        if (sock.socket) {
            sock.socket.complete();
            sock.socket.unsubscribe();
        }
        sock = undefined;
    }

    /**
     * ping the server
     */
    function ping () {
        sendMessage('ping', null);
        outgoingMessage$.next({
            method: 'ping',
            data: null
        });
    }

    /**
     * Get the full server address given an endpoint id
     */
    function getUrl (endpointId: string, useSsl: boolean) {
        const proto = (useSsl) ? 'wss' : 'ws';
        const PORT = (useSsl) ? config.ports.eventBusSsl : config.ports.eventBus;
        const URL = `${proto}://${config.uiHostname}:${PORT}/`;
        endpointId = encodeURIComponent(endpointId);
        return `${URL}?endpointId=${endpointId}`;
    }

    /**
     * Send a subscription request for a message topic
     * @param {string} topic - Message topic to subscribe to
     */
    function subscribe (topic: string) {
        if (!sock || !sock.endpointId) { throw Error('Not connected'); }
        const id = getMessageId(sock.endpointId);
        outgoingMessage$.next({
            method: 'subscribe',
            id,
            data: {topic}
        });
        return socketEvent$.pipe(
            filter(evt => (
                evt.method === 'subscription.received' &&
                evt.id === id
            )),
            take(1),
            flatMap(() => socketEvent$.pipe(
                filter(evt => (evt.method === 'message' &&
                    R.path(['data', 'topic'], evt) === topic)
                )
            ))
        );
    }

    /**
     * unsubscribe from a previously subscribed topic
     * @param topic
     */
    function unsubscribe (topic: string) {
        if (!sock || !sock.endpointId) { throw Error('Not connected'); }
        const id = getMessageId(sock.endpointId);
        outgoingMessage$.next({
            method: 'unsubscribe',
            id,
            data: {topic}
        });
        return socketEvent$.pipe(
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
    function request (endpointId: string, topic: string, params?: any) {
        if (!sock || !sock.endpointId) { throw Error('Not connected'); }
        const id = getMessageId(sock.endpointId);
        outgoingMessage$.next({
            to: endpointId,
            method: 'request',
            id,
            data: {topic, params}
        });
        return socketEvent$.pipe(
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
    function sendMessage (topic: string, message: any, to?: string) {
        outgoingMessage$.next({
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
    function sendSocketMessage(msg: SocketEvent) {
        if (sock) {
            msg = R.merge(msg, {
                from: sock.endpointId
            });
            sock.send(msg);
        } else {
            messageBuffer.push(msg);
        }
    }

    /**
     * listen for requests on the socket
     * Exposed as exports.requests
     */
    const requestStream = socketEvent$.pipe(
        filter(evt => (evt.method === 'request')),
        map(request => ({
            topic: request.data.topic,
            params: request.data.params,
            respond: R.once(R.partial(respond, [request.from, request.id]))
        }))
    );

    /**
     * Added to request notifications as a method with bound params to allow observer methods to
     * Send a reply to a request.
     * @param to - target endpoint id (should be the endpoint that sent the original request)
     * @param id - id of the original request
     * @param [params] - Response data
     */
    function respond (to: string, id:string, params: any) {
        outgoingMessage$.next({
            method : 'request.response',
            to : to,
            id : id,
            data : params
        });
    }

    return {
        connect,
        disconnect,
        subscribe,
        unsubscribe,
        sendMessage,
        request,
        requests : requestStream
    };
}

export default createInstance({
    uiHostname: 'foo',
    eventBus: {
        secret: 'foo',
    },
    ports: {
        eventBus: 80,
        eventBusSsl: 8080,
    }
})