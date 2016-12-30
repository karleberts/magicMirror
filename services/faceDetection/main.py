from __future__ import print_function
#import ptvsd
#ptvsd.enable_attach("my_secret", address = ('0.0.0.0', 3000))
#ptvsd.wait_for_attach()
"""detect faces and report to the event_bus"""
import json
import imp
# import io
import os
import sys
import time
import cv2
from picamera.array import PiRGBArray
from picamera import PiCamera
import picamera
from tornado import ioloop
# from rx.subjects import ReplaySubject, Subject
from rx import Observable

DIRNAME = os.path.dirname(__file__)
EVENT_BUS = imp.load_source('client', os.path.join(DIRNAME, '..', 'eventBus', 'client.py'))
CONFIG_FILE = open(os.path.join(DIRNAME, '..', '..', 'config.json'), 'r')
CASCADE_PATH = os.path.join(DIRNAME, 'haarcascade_frontalface_default.xml')
CONFIG = json.load(CONFIG_FILE)
FACE_CASCADE = cv2.CascadeClassifier(CASCADE_PATH)
ENDPOINT_ID = 'faceDetect'

timer = Observable.interval(500);

def get_image_as_array(camera):
    """grab a frame and convert to a numpy array"""
    # image = cv2.imread(os.path.join(DIRNAME, 'snapshot.jpg'))
    raw_capture = PiRGBArray(camera)
    t = time.time()
    camera.capture(raw_capture, format='bgr', use_video_port=True)
    image = raw_capture.array
    u = time.time()
    elapsed = u - t
    # print('{} capture'.format(elapsed))
    return image
def find_faces_in_image(image):
    """Find faces in the given opencv numpy array"""
    t = time.time()
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    u = time.time()
    elapsed = u - t
    # print('{} converting to gray'.format(elapsed))
    t = time.time()
    faces = FACE_CASCADE.detectMultiScale(gray)
    u = time.time()
    elapsed = u - t
    # print('{} searching faces'.format(elapsed))
    return len(faces)
def get_msg_handler(camera):
    def on_msg(msg):
        """event_bus message handler"""
        try:
            image = get_image_as_array(camera)
            face_count = find_faces_in_image(image)
        except (KeyboardInterrupt, SystemExit):
            raise
        except Exception:
            camera.close()
            sys.exit()
        # print("found {0} faces".format(face_count))
        return face_count > 0
    return on_msg


def start():
    """Callback when event_bus connection succeeds"""
    print('connected to event bus')
    camera = PiCamera(resolution='320x240')
    # camera.start_preview();
    on_msg = get_msg_handler(camera)
    # tests_messages.subscribe(on_msg)
    time.sleep(1)
    result_stream = (timer.map(on_msg)
                     .share())
    found_stream = (result_stream
                    .filter(lambda x: x is True))
    not_found_stream = (result_stream.scan(lambda acc, x: ([x] + acc)[:5], [])
                        .filter(lambda buf: all(result is False for result in buf))
                        .map(lambda res: False))
    (Observable.merge(found_stream, not_found_stream)
     .distinct_until_changed()
     .subscribe(lambda res: EVENT_BUS.send_message('faceDetect.result', res)))
    EVENT_BUS.send_message('faceDetect.ready', True, 'magicMirror');

def main():
    """kick this party off"""
    EVENT_BUS.connect(ENDPOINT_ID, start)
    print('running')


if __name__ == '__main__':
    main()
    ioloop.IOLoop.instance().start()
