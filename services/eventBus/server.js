var config = require('../../config.json');
const PORT = config.ports.eventBus;

var memwatch = require('memwatch-next');
memwatch.on('leak', function(info) {
	console.log(info);
});

var Rx = require('rx');
var messageStream = new Rx.Subject();

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({'port' : PORT});

wss.on('connection', function (ws) {
	var socketMessages = Rx.Observable.fromEvent(ws, 'message')
		.map(function (msg) {
			return JSON.parse(msg);
		});
	var subscriptions = [];
	//clean up on ws disconnect
	Rx.Observable.fromEvent(ws, 'close')
		.subscribe(Rx.Observer.create(function () {
			subscriptions.forEach(function (sub) {
				sub.dispose();
			});
			subscriberSubscription.dispose();
			messageSubscription.dispose();
		}));

	//handle 'subscribe' messages
	//e.g. {method: 'subscribe', data: {topic: 'foo'}}
	var subscriptionObserver = Rx.Observer
		.create(function (subscriptionRequest) {
			var messageSubscription = messageStream
				.filter(function (message) {
					return ((message.from !== ws) &&
							(message.topic === subscriptionRequest.topic));
				})
				.subscribe(Rx.Observer.create(
					function (message) {
						ws.send(JSON.stringify({
							'method' : 'message',
							'data' : {
								'topic': message.topic,
								'contents': message.contents
							}
						}));
					}
				));
			subscriptions.push(messageSubscription);
		});
	var subscriberSubscription = socketMessages
		.filter(function (msg) {
			return (msg.method === 'subscribe');
		})
		.map(function (evt) {
			return {
				'topic' : evt.data.topic,
				'id' : evt.id
			}
		})
		.do(function (subscriptionRequest) {
			ws.send(JSON.stringify({
				'method' : 'subscription.response',
				'id' : subscriptionRequest.id
			}))
		})
		.subscribe(subscriptionObserver);

	//rebroadcast regular messages to all subscribed parties
	//e.g. {method: 'message', data: {message: {foo: 'bar}}}
	var messageSubscription = socketMessages
		.filter(function (msg) {
			return (msg.method === 'message');
		})
		.subscribe(Rx.Observer.create(function (msg) {
			messageStream.onNext({
				'from' : ws,
				'topic' : msg.data.topic,
				'contents' : msg.data.contents
			});
		}))
});