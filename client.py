import os
import json
import urllib
from threading import Timer
from funcy import merge, once, partial
from tornado.websocket import websocket_connect
from rx.subjects import ReplaySubject, Subject

def get_config():
    config_file = open('../../config.json', 'r')
    config = json.load(config_file)
    config_file.close()
    return config

CONFIG = get_config()
VARS = {
    'endpoint_id': None,
    'message_queue': ReplaySubject(),
    'message_id': 0,
    'sock': None,
    'message_buffer': []
};
EVENT_SOURCE = Subject()

def get_message_id():
    """get unique message id"""
    num = VARS['message_id']
    VARS['message_id'] = VARS['message_id'] + 1
    return '{!s}:{!s}'.format(VARS['endpoint_id'], num)

def _on_message(msg):
    if msg is None:
        #disconnected
        on_disconnect()
        reconnect()
    else:
        EVENT_SOURCE.on_next(json.loads(msg))

def on_disconnect():
    """clean up"""
    VARS['sock'] = None

def connect(endpoint_id, callback):
    """get started"""
    def _connect_callback(params):
        if params.exception() is not None:
            print params.exception()
            #TODO- reconnect on err...
        else:
            VARS['sock'] = params.result()
            VARS['endpoint_id'] = endpoint_id
            VARS['message_queue'].subscribe(_send_socket_message)
            VARS['message_queue'].on_next({
                'method': 'message',
                'data': {
                    'topic': 'auth',
                    'contents': CONFIG['eventBus']['secret']
                }
            })
            for msg in VARS['message_buffer']:
                VARS['message_queue'].on_next(msg)
            VARS['message_buffer'] = []
            callback()
    query = urllib.urlencode({'endpointId': endpoint_id})
    port = CONFIG['ports']['eventBus']
    url = 'ws://localhost:{!s}/?{!s}'.format(port, query)
    websocket_connect(url, None, _connect_callback, None, _on_message)

def reconnect():
    """IFF the socket is disconnected, make a reconnect attempt in 1 sec"""
    if VARS['sock'] is None:
        Timer(1.0, connect, (VARS['endpoint_id'], reconnect))

def disconnect():
    """close socket and don't reconnect"""
    if VARS['sock'] is None:
        raise RuntimeError('Not connected')
    VARS['sock'].close()

def subscribe(topic):
    """returns an observable of socket messages for thie topic"""
    if VARS['sock'] is None:
        raise RuntimeError('Not connected')
    msg_id = get_message_id()
    VARS['message_queue'].on_next({
        'method': 'subscribe',
        'id': msg_id,
        'data': {'topic': topic}
    })
    def _is_message_response(evt):
        return evt['method'] == 'message' and \
            (evt['data'] is not None and evt['data']['topic'] == topic)
    def _sel_func(msg):
        return EVENT_SOURCE.filter(_is_message_response)
    return (EVENT_SOURCE
            .filter(lambda evt: evt['method'] == 'subscription.received' and evt['id'] == msg_id)
            .take(1)
            .select_many(_sel_func))

def unsubscribe(topic):
    """stop listening for thie topic"""
    if VARS['sock'] is None:
        raise RuntimeError('Not connected')
    msg_id = get_message_id()
    VARS['message_queue'].on_next({
        'method': 'unsubscribe',
        'id': msg_id,
        'data': {'topic': topic}
    })
    return (EVENT_SOURCE
            .filter(lambda evt: evt['method'] == 'unsubscribe.response' and evt['id'] == msg_id)
            .take(1))

def request(target_endpoint, topic, params):
    """send a req"""
    if VARS['sock'] is None:
        raise RuntimeError('Not connected')
    msg_id = get_message_id()
    VARS['message_queue'].on_next({
        'to': target_endpoint,
        'method': 'request',
        'id': msg_id,
        'data': {'topic': topic, 'params': params}
    })
    def _is_request_response(evt):
        return evt['method'] == 'request.response' and \
            evt['from'] == target_endpoint and \
            evt['id'] == msg_id
    def _map_response_data(response):
        if response['error'] is not None:
            raise RuntimeError(response['error'])
        return response['data']
    return (EVENT_SOURCE
            .filter(lambda evt: evt['method'] == 'request.received' and evt['id'] == msg_id)
            .take(1)
            .select_many(lambda x: EVENT_SOURCE.filter(_is_request_response))
            .take(1)
            .take_until_with_time(10000)
            .map(_map_response_data))

def send_message(topic, message, to=None):
    """send the message over the bus"""
    VARS['message_queue'].on_next({
        'method': 'message',
        'to': to,
        'data': {
            'topic': topic,
            'contents': message
        }
    })

def _send_socket_message(_msg):
    if VARS['sock'] is None:
        raise RuntimeError('Not connected')
    msg = merge(_msg, {
        'from': VARS['endpoint_id']
    })
    VARS['sock'].write_message(json.dumps(msg))

def respond(recipient, msg_id, params):
    """respond to a request"""
    VARS['message_queue'].on_next({
        'method': 'request.response',
        'to': recipient,
        'id': msg_id,
        'data': params
    })

def map_req_to_req_stream(request):
    """incoming requests get mapped to the request stream"""
    topic = request['data']['topic']
    params = request['data']['params']
    @once
    def _respond(params):
        return respond(request['from'], request['id'], params)
    return {
        'topic': topic,
        'params': params,
        'respond': _respond
    }
request_stream = (EVENT_SOURCE.filter(lambda evt: evt['method'] == 'request')
                  .map(map_req_to_req_stream))