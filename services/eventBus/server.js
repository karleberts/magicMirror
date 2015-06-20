var config = require('../../config.json');
const PORT = config.ports.eventBus;

var Rx = require('rx');
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({'port' : PORT});

var eventStream = Rx.Observable.create().publish();

wss.on('connection', function (ws) {
	var sock = Rx.Observable.create(obs => {
		ws.on('message', msg => obs.onNext(msg));
		//ws.on('error', e => obs.onError(e)
		//ws.on('close')
	});
});

function subjectFromSocket (sock) {
	var observable = Rx.Observable.create(function (observer) {

	})
}
