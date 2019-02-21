"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var R = require("ramda");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var websocketSubject_1 = require("./websocketSubject");
var config = require('../config.json');
var UI_HOSTNAME = config.uiHostname;
function createInstance() {
    var socketEvent$ = new rxjs_1.Subject(); //incoming messages
    var outgoingMessage$ = new rxjs_1.Subject(); //outgoing messages
    outgoingMessage$.subscribe(sendSocketMessage);
    var messageBuffer = [];
    var messageId = 0;
    var sock = null;
    /**
     * Generate a unique message ID for this endpoint
     * @param endpointId {string}
     */
    function getMessageId(endpointId) {
        return endpointId + ":" + messageId++;
    }
    /**
     * Connect to the server using the specified endpoint id
     */
    function connect(endpointId, useSsl) {
        if (useSsl === void 0) { useSsl = false; }
        var socketPromise = new Promise(function (resolve, reject) {
            var url = getUrl(endpointId, useSsl);
            sock = new websocketSubject_1.default(url);
            sock.endpointId = endpointId;
            sock.subscribe(function (msg) { return socketEvent$.next(msg); });
            rxjs_1.interval(50000).pipe(operators_1.withLatestFrom(sock.connectionStatus)).subscribe(function (_a) {
                var i = _a[0], isConnected = _a[1];
                return isConnected && ping();
            });
            sock.connectionStatus.pipe(operators_1.take(1)).subscribe(function (connectionStatus) {
                if (connectionStatus) {
                    resolve(sock);
                }
                else {
                    reject(connectionStatus);
                }
            });
        });
        return socketPromise.then(function (sock) {
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
    function disconnect() {
        if (!sock) {
            throw new Error('Not connected');
        }
        sock.socket.complete();
        sock.socket.unsubscribe();
        sock = null;
    }
    /**
     * ping the server
     */
    function ping() {
        sendMessage('ping', null);
        outgoingMessage$.next({
            method: 'ping',
            data: null
        });
    }
    /**
     * Get the full server address given an endpoint id
     */
    function getUrl(endpointId, useSsl) {
        var proto = (useSsl) ? 'wss' : 'ws';
        var PORT = (useSsl) ? config.ports.eventBusSsl : config.ports.eventBus;
        var URL = proto + "://" + UI_HOSTNAME + ":" + PORT + "/";
        endpointId = encodeURIComponent(endpointId);
        return URL + "?endpointId=" + endpointId;
    }
    /**
     * Send a subscription request for a message topic
     * @param {string} topic - Message topic to subscribe to
     */
    function subscribe(topic) {
        if (!sock || !sock.endpointId) {
            throw Error('Not connected');
        }
        var id = getMessageId(sock.endpointId);
        outgoingMessage$.next({
            method: 'subscribe',
            id: id,
            data: { topic: topic }
        });
        return socketEvent$.pipe(operators_1.filter(function (evt) { return (evt.method === 'subscription.received' &&
            evt.id === id); }), operators_1.take(1), operators_1.flatMap(function () { return socketEvent$.pipe(operators_1.filter(function (evt) { return (evt.method === 'message' &&
            R.path(['data', 'topic'], evt) === topic); })); }));
    }
    /**
     * unsubscribe from a previously subscribed topic
     * @param topic
     */
    function unsubscribe(topic) {
        if (!sock || !sock.endpointId) {
            throw Error('Not connected');
        }
        var id = getMessageId(sock.endpointId);
        outgoingMessage$.next({
            method: 'unsubscribe',
            id: id,
            data: { topic: topic }
        });
        return socketEvent$.pipe(operators_1.filter(function (evt) { return (evt.method === 'unsubscribe.response' &&
            evt.id === id); }), operators_1.take(1));
    }
    /**
     * Send a request to a specified endpoint
     * @param {string} endpointId - Request recipient's endpoint id (e.g. magicMirror.ui)
     * @param {string} topic - Request identifier
     * @param {object} [params] - Additional request params (some requests may not require params)
     */
    function request(endpointId, topic, params) {
        if (!sock || !sock.endpointId) {
            throw Error('Not connected');
        }
        var id = getMessageId(sock.endpointId);
        outgoingMessage$.next({
            to: endpointId,
            method: 'request',
            id: id,
            data: { topic: topic, params: params }
        });
        return socketEvent$.pipe(operators_1.filter(function (evt) { return evt.method === 'request.response' &&
            evt.from === endpointId && evt.id === id; }), operators_1.take(1), operators_1.timeout(10000), //dispose of the response stream after 10s?
        operators_1.map(function (response) {
            if (response.error) {
                throw new Error(response.error);
            }
            return response.data;
        }));
    }
    /**
     * @param {string} topic - Message topic id
     * @param {object} message - message payload
     * @param {string} [to] - Optional endpoint id for directed messaging
     */
    function sendMessage(topic, message, to) {
        outgoingMessage$.next({
            method: 'message',
            to: to,
            data: {
                topic: topic,
                contents: message
            }
        });
    }
    /**
     * Internal method for putting data out the socket
     * @param {object} msg - Packet to send over the socket, format should correspond to something the server knows how to interpret'
     */
    function sendSocketMessage(msg) {
        if (sock) {
            msg = R.merge(msg, {
                from: sock.endpointId
            });
            sock.send(msg);
        }
        else {
            messageBuffer.push(msg);
        }
    }
    /**
     * listen for requests on the socket
     * Exposed as exports.requests
     */
    var requestStream = socketEvent$.pipe(operators_1.filter(function (evt) { return (evt.method === 'request'); }), operators_1.map(function (request) { return ({
        topic: request.data.topic,
        params: request.data.params,
        respond: R.once(R.partial(respond, [request.from, request.id]))
    }); }));
    /**
     * Added to request notifications as a method with bound params to allow observer methods to
     * Send a reply to a request.
     * @param to - target endpoint id (should be the endpoint that sent the original request)
     * @param id - id of the original request
     * @param [params] - Response data
     */
    function respond(to, id, params) {
        outgoingMessage$.next({
            method: 'request.response',
            to: to,
            id: id,
            data: params
        });
    }
    return {
        connect: connect,
        disconnect: disconnect,
        subscribe: subscribe,
        unsubscribe: unsubscribe,
        sendMessage: sendMessage,
        request: request,
        requests: requestStream
    };
}
exports.createInstance = createInstance;
exports.default = createInstance();
//# sourceMappingURL=client.js.map