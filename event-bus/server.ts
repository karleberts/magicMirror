import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as querystring from 'querystring';
import R from 'ramda';
import {
	Subject,
	fromEvent,
	merge,
	of,
	throwError, Observable
} from 'rxjs';
import {
	tap,
	filter,
	map,
	scan,
	share,
	take,
	takeUntil,
	withLatestFrom,
    mergeMap,
} from 'rxjs/operators';
import WebSocket, { Server } from 'ws';
import * as https from 'https';
import { SocketEvent } from './types';
import { IncomingMessage } from 'http';

export interface Config {
    eventBus: {
        secret: string,
    },
    ports: {
        eventBus: number,
        eventBusSsl: number,
    },
}

type Client = WebSocket & {
	reqUrl: string,
}

export default function createServer (WebSocketServer: typeof Server, config: Config) {
    console.log('creating an event bus server');
	const PORT = config.ports.eventBus;
	const SSL_PORT = config.ports.eventBusSsl;
	const privateKey  = fs.readFileSync(path.join(__dirname, '../certs/eventBus.key'), 'utf8');
	const certificate = fs.readFileSync(path.join(__dirname, '../certs/eventBus.crt'), 'utf8');
	const credentials = {
		key: privateKey,
		cert: certificate
	};
	const ws = new WebSocketServer({port: PORT});
	const server = https
		.createServer(credentials, (req, res) => {
			res.writeHead(200);
			res.end('hello world\n');
		})
		.listen(SSL_PORT);
	const wss = new WebSocketServer({server});
	//stream of 'message' type messages
	const messageBus = new Subject<SocketEvent>();
	const disconnect$ = new Subject();

	function notifyReceived (ws: Client, method: string, id: string) {
		ws.send(JSON.stringify({method, id}));
	}

	function getEndpointIdFromConnection (ws: Client): string {
		const query = querystring.parse(url.parse(ws.reqUrl).query || '');
		if (!query || !query.endpointId) {
			throw new Error('No endpoint');
		}
		return (query.endpointId instanceof Array) ?
			query.endpointId[0] :
			query.endpointId;
	}


	function handleConnection (client: Client) {
		const endpointId = getEndpointIdFromConnection(client);
        console.log(`${endpointId} connected`);
		//can dispose of the underlying streams on disconnect by doing something
		//in this stream's subscription? (not sure if necessary)
		const disconnectionStream  = fromEvent<SocketEvent>(client, 'close');
		disconnectionStream.subscribe(() => disconnect$.next(endpointId));

		if (endpointId === 'debug') {
			return messageBus.pipe(
				takeUntil(disconnectionStream),
			).subscribe(msg => client.send(JSON.stringify(msg)));
		}

		const messageStream = messageBus.pipe(
			takeUntil(disconnectionStream),
			share()
		);

		/**
		 * Stream of all incoming socket messages
		 */
		const socketMessages = fromEvent<SocketEvent>(client, 'message').pipe(
			map((msg: SocketEvent) => JSON.parse(msg.data)),
			takeUntil(disconnectionStream),
			// tap(msg => console.log('incoming msg', msg)),
			share()
		);

		/**
		 * ping/pong for socket keepalive
		 * client pings, server pongs
		 */
		socketMessages.pipe(
			filter(msg => msg.method === 'ping'),
		).subscribe(() => client.send(JSON.stringify({
			method: 'pong'
		})));

		/**
		 * rebroadcast regular messages to all subscribed parties
		 * e.g. {method: 'message', data: {message: {foo: 'bar}}}
		 */
		socketMessages.pipe(
			filter(msg => R.contains(msg.method, [
				'message',
				'request',
				'request.response'
			])),
		).subscribe(msg => messageBus.next({
			method: msg.method,
			id: msg.id,
			to: msg.to,
			from: endpointId,
			data: msg.data
		}));

		/**
		 * Handle subscription requests
		 * e.g. {method: 'subscribe', data: {topic: 'foo'}}
		 * Notifies the subscriber of the subscription reception
		 */
		const subscriptionStream = socketMessages.pipe(
			filter(msg => msg.method === 'subscribe'),
			map(evt  => ({
				type: 'subscribe',
				topic: evt.data.topic,
				id: evt.id
			})),
			tap(req => notifyReceived(client, 'subscription.received', req.id))
		);

		const unsubStream = socketMessages.pipe(
			filter(msg => msg.method === 'unsubscribe'),
			map(evt => ({
				type: 'unsubscribe',
				topic: evt.data.topic,
				id: evt.id
			})),
			tap(req => notifyReceived(client, 'unsubscribe.response', req.id))
		);

		//build a stream from subscriptionStream, removing topics when an 'unsub' message is received
		const aggregateSubscriptionStream = merge(subscriptionStream, unsubStream).pipe(
			scan((subscriptions: {[k: string]: boolean}, req) => {
				if (req.type === 'subscribe') {
					subscriptions[req.topic] = true;
				} else {
					delete subscriptions[req.topic];
				}
				return subscriptions;
			}, {})
		);


		//start the outgoing message stream def by getting incoming messages from other sockets
		//with topics to which this socket has subscribed
		const subscribedMessageStream = messageStream.pipe(
			filter(msg => msg.method === 'message'),
			withLatestFrom(
				aggregateSubscriptionStream,
				(message: SocketEvent, subscriptions) => ({message, subscriptions})
			),
			filter(p => {
				const { message, subscriptions } = p;
				return (message.from !== endpointId &&
					(!message.to || message.to === endpointId) &&
					subscriptions[message.data.topic]);
			}),
			map(evt => evt.message)
		);

		//Stream of all 'request' messages from any socket
		//filter out any not designated for this endpoint
		const requestsForEndpointStream = messageStream.pipe(
			filter(msg => msg.method === 'request' && msg.to === endpointId)
		);


		/**
		 * Route request.response messages to this endpoint
		 * client can filter valid req ids
		 */
		const requestResponseStream = messageStream.pipe(
			filter(msg => (msg.method === 'request.response' &&
				msg.to === endpointId))
		);

		/**
		 * Merge all the message streams the client needs to receive
		 * @type {T|Rx.Observable<T>}
		 */
		const outgoingMessageStream = merge(
			subscribedMessageStream,
			requestsForEndpointStream,
			requestResponseStream
		);

		return outgoingMessageStream.subscribe(msg => {
			//send the message over the socket
			client.send(JSON.stringify(msg));
		});
	}

	function checkAuth ([[client, req]]: [[Client, IncomingMessage]]) {
		return fromEvent<SocketEvent>(client, 'message').pipe(
			take(1),
			mergeMap(evt => {
				try {
					const msg = JSON.parse(evt.data);
					if (msg.data.topic === 'auth' &&
							msg.data.contents === config.eventBus.secret) {
						client.reqUrl = req.url as string;
						return of(client);
					}
				} catch (e) {
					console.error('error parsing auth msg data');
				}
				client.close();
				return throwError(Error('Unable to authenticate'));
			})
		);
	}

	const outgoingMessageStreamSubscription = merge(
        fromEvent(wss, 'connection').pipe(
            map(Array.of)
        ),
        fromEvent(ws, 'connection').pipe(map(Array.of))
	).pipe(
		mergeMap<any, any>(checkAuth)
	).subscribe(handleConnection);

	return [
		outgoingMessageStreamSubscription,
		disconnect$,
	];
}