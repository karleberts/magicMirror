import os
import json
import urllib;
from funcy import merge, once, partial;

# import tornadokk
from tornado.websocket import websocket_connect
# from tornado.web import RequestHandler, StaticFileHandler, Application, url
# from tornado.escape import json_encode, json_decode
from rx.subjects import ReplaySubject, Subject;

config_file = open('../../config.json', 'r')
config = json.load(config_file);
config_file.close();
port = config['ports']['eventBus']

vars = {
	'endpoint_id': None,
	'message_queue': ReplaySubject(),
	'message_id': 0,
	'sock': None
};
event_source = Subject();

def get_message_id():
	num = vars['message_id'];
	vars['message_id'] = vars['message_id'] + 1;
	return '{!s}:{!s}'.format(vars['endpoint_id'], num);


def _on_message(msg):
	if msg is None:
		#disconnected
		on_disconnect();
	else:
		event_source.on_next(json.loads(msg));

def on_disconnect():
	vars['sock'] = None;
	vars['message_queue'].on_completed();
	vars['message_queue'] = ReplaySubject();

def connect(endpoint_id, callback):
	def _connect_callback(p):
		if (p.exception() is not None):
			print p.exception();
			#TODO- reconnect on err...
		else:
			vars['sock'] = p.result();
			vars['endpoint_id'] = endpoint_id;
			vars['message_queue'].subscribe(_send_socket_message);
			callback();
	query = urllib.urlencode({'endpointId': endpoint_id});
	url = 'ws://localhost:{!s}/?{!s}'.format(port, query);
	websocket_connect(url, None, _connect_callback, None, _on_message);

def disconnect():
	if (vars['sock'] is None):
		raise RuntimeError('Not connected');
	vars['sock'].close();

def subscribe(topic):
	if (vars['sock'] is None):
		raise RuntimeError('Not connected');
	id = get_message_id();
	vars['message_queue'].on_next({
		'method': 'subscribe',
		'id': id,
		'data': {'topic': topic}
	});
	def is_message_response(evt):
		return evt['method'] == 'message' and \
			(evt['data'] is not None and evt['data']['topic'] == topic);
	def sel_func(x):
		print x;
		return event_source.filter(is_message_response);
	return event_source.filter(lambda evt: evt['method'] == 'subscription.received' and evt['id'] == id) \
		.take(1) \
		.select_many(sel_func) \

def unsubscribe(topic):
	if (vars['sock'] is None):
		raise RuntimeError('Not connected');
	id = get_message_id();
	vars['message_queue'].on_next({
		'method': 'unsubscribe',
		'id': id,
		'data': {'topic': topic}
	});
	return event_source.filter(
		lambda evt: evt['method'] == 'unsubscribe.response' and evt['id'] == id
	).take(1);

def request(target_endpoint, topic, params):
	if (vars['sock'] is None):
		raise RuntimeError('Not connected');
	id = get_message_id();
	vars['message_queue'].on_next({
		'to': target_endpoint,
		'method': 'request',
		'id': id,
		'data': {'topic': topic, 'params': params}
	});
	def is_request_response(evt):
		return evt['method'] == 'request.response' and \
			evt['from'] == target_endpoint and \
			evt['id'] == id;
	def map_response_data(response):
		if (response['error'] is not None):
			raise RuntimeError(response['error']);
		return response['data'];
	return event_source.filter(
		lambda evt: evt['method'] == 'request.received' and evt['id'] == id
	).take(1).select_many(
		lambda x: event_source.filter(is_request_response)
	).take(1).map(map_response_data);

def send_message(topic, message, to=None):
	vars['message_queue'].on_next({
		'method': 'message',
		'to': to,
		'data': {
			'topic': topic,
			'contents': message
		}
	})

def _send_socket_message(_msg):
	if (vars['sock'] is None):
		raise RuntimeError('Not connected');
	msg = merge(_msg, {
		'from': vars['endpoint_id']
	});
	vars['sock'].write_message(json.dumps(msg));

def respond(to, id, params):
	vars['message_queue'].on_next({
		'method': 'request.response',
		'to': to,
		'id': id,
		'data': params
	});

def map_req_to_req_stream(request):
	topic = request['data']['topic'];
	params = request['data']['params'];
	@once
	def _respond(params):
		return respond(request['from'], request['id'], params);
	return {
		'topic': topic,
		'params': params,
		'respond': _respond
	}
request_stream = event_source.filter(
	lambda evt: evt['method'] == 'request'
).map(map_req_to_req_stream);