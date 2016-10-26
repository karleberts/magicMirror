import os
import json
import imp
from tornado import ioloop

event_bus = imp.load_source('client', '../eventBus/client.py');

from rx.subjects import ReplaySubject, Subject;
from rx import Observable;

config_file = open('../../config.json', 'r')
config = json.load(config_file);
port = config['ports']['eventBus']
endpoint_id = 'magicMirror.faceDetect';


def start():
    tests_messages = event_bus.subscribe('test');
    def on_msg(msg):
        print 'karl';
        print msg;
    tests_messages.subscribe(on_msg);
    def msg_sender(x):
        event_bus.send_message('foo', {
            'test': 'foo'
        });
        
    Observable.interval(5000) \
        .subscribe(msg_sender);

def main():
    event_bus.connect(endpoint_id, start);
    print 'hi';


if __name__ == '__main__':
    main()
    ioloop.IOLoop.instance().start()