var config = require('../../config.json');
const PORT = config.ports.eventBus;

var Rx = require('rx');
var eventStream = new Rx.Subject();

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({'port' : PORT});

var idSeq = 0;
var sockets = {};
wss.on('connection', function (ws) {
	ws.id = idSeq++;
	var sock = sockets[ws.id] = new Rx.Subject();
	//clean up on ws disconnect
	sock.fromEvent(ws, 'close')
		.map(function () {
			ws.removeAllListeners();
			sock.dispose();
		})
	var messageStream = sock.fromEvent(ws, 'message')
		.map(function (msg) {
			return JSON.parse(msg);
		});
	//handle 'subscribe' messages
	//e.g. {method: 'subscribe', data: {topic: 'foo'}}
	messageStream.filter(function (msg) {
		return (msg.method === 'subscribe');
	})
		.do(function (msg) {
			eventStream.filter(function (evt) {
				return ((evt.from !== ws) &&
						(evt.message.topic === msg.data.topic));
			})
				.map(function (evt) {
					return JSON.parse(evt.message);
				})
				.subscribe(
					function (msg) {
						ws.send(msg);
					}
				)
		})
	//rebroadcast regular messages to all subscribed parties
	//e.g. {method: 'message', data: {message: {foo: 'bar}}}
	messageStream.filter(function (msg) {
		return (msg.type === 'message');
	})
		.map(function (msg) {
			return msg.data.message;
		})
		.do(function (msg) {
			eventStream.onNext({
				'message' : msg,
				'from' : ws
			});
		})
});
