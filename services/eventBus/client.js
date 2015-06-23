/**
 * Created by Karl on 6/21/2015.
 */
var Rx = window.Rx = require('rx');
var WebSocket = require('ws');

var config = require('../../config.json');
const PORT = config.ports.eventBus;
const URL = 'ws://localhost:' + PORT + '/';
var eventSource = new Rx.Subject();

var sock;
function connect () {
    return new Promise(function (resolve, reject) {
        sock = fromWebsocket(URL, null, Rx.Observer.create(function () {
            //connected
            resolve();
        }))
            .subscribe(Rx.Observer.create(
                function (evt) {
                    eventSource.onNext(evt);
                },
                function (err) {
                    //reconnect on error
                },
                function () {
                    //reconnect on disconnect
                }
            ));
    });
}

var streams = {};
function getEventStream (method, topic) {
    if (!sock) {
        throw new Error('no socket defined');
    }
    if (!streams[method]) {
        streams[method] = {};
    }
    if (!streams[method][topic]) {
       streams[method][topic] = eventSource
            .filter(function (evt) {
                return ((evt.method === method) &&
                        (!topic ||  (evt.topic === topic)));
            });
    }
    return streams[method][topic];
}
//send the subscription to the server
var messageId = 0;
function subscribe (topic) {
    var id = messageId++;
    sendMessage({
        'method' : 'subscribe',
        'topic' : topic,
        'id' : id
    });
    var subscrgetEventStream('message', topic);
    eventSource
        .filter(function (evt) {
            return (evt.method === 'subscription.response' &&
                    evt.id === id);
        })
        .take(1)
        .timeout(100)
        .subscribeOnError(function (err) {
            subscribedEvents.onError(err);
        });
    return subscribedEvents;
}

var messageId = 0;
function sendMessage (msg) {
    sock.onNext(JSON.stringify(msg))
}


module.exports = {
    'subscribe' : subscribe,
    'connect' : connect
}


//adapted from rx-dom
function fromWebsocket (url, protocol, openObserver, closingObserver) {
    if (!WebSocket) { throw new TypeError('WebSocket not implemented in your runtime.'); }

    var socket;

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

    var observable = Rx.Observable.create(function (obs) {
        socket = protocol ? new WebSocket(url, protocol) : new WebSocket(url);
        if (!socket.removeEventListener && socket.removeListener) {
            socket.removeEventListener = socket.removeListener;
        }

        function openHandler(e) {
            openObserver.onNext(e);
            openObserver.onCompleted();
            socket.removeEventListener('open', openHandler, false);
        }
        function messageHandler(e) { obs.onNext(e); }
        function errHandler(e) { obs.onError(e); }
        function closeHandler(e) {
            if (e.code !== 1000 || !e.wasClean) { return obs.onError(e); }
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

    var observer = Rx.Observer.create(
        function (data) {
            socket && socket.readyState === WebSocket.prototype.OPEN && socket.send(data);
        },
        function(e) {
            if (!e.code) {
                throw new Error('no code specified. be sure to pass { code: ###, reason: "" } to onError()');
            }
            socketClose(e.code, e.reason || '');
        },
        function() {
            socketClose(1000, '');
        }
    );

    return Rx.Subject.create(observer, observable);
};