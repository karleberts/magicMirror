import ptvsd
ptvsd.enable_attach("my_secret", address = ('0.0.0.0', 3000))
ptvsd.wait_for_attach()
"""detect faces and report to the event_bus"""
import json
import imp
# import io
import os
import sys
# import time
import cv2
from picamera.array import PiRGBArray
from picamera import PiCamera
import picamera
from tornado import ioloop
# from rx.subjects import ReplaySubject, Subject
# from rx import Observable

DIRNAME = os.path.dirname(__file__)
EVENT_BUS = imp.load_source('client', os.path.join(DIRNAME, '..', 'eventBus', 'client.py'))
CONFIG_FILE = open(os.path.join(DIRNAME, '..', '..', 'config.json'), 'r')
CASCADE_PATH = os.path.join(DIRNAME, 'haarcascade_frontalface_default.xml')
CONFIG = json.load(CONFIG_FILE)
FACE_CASCADE = cv2.CascadeClassifier(CASCADE_PATH)
ENDPOINT_ID = 'magicMirror.faceDetect'

def get_image_as_array(camera, raw_capture):
    """grab a frame and convert to a numpy array"""
    image = cv2.imread(os.path.join(DIRNAME, 'noface.jpg'))
    # camera.capture(raw_capture, format='bgr');
    # image = raw_capture.array
    return image
def find_faces_in_image(image):
    """Find faces in the given opencv numpy array"""
    print image
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = FACE_CASCADE.detectMultiScale(gray)
    print "found {0} faces".format(len(faces))
    return


def start():
    """Callback when event_bus connection succeeds"""
    print 'connected to event bus'
    tests_messages = EVENT_BUS.subscribe('test')
    camera = PiCamera()
    raw_capture = PiRGBArray(camera)
    print camera
    def on_msg(msg):
        """event_bus message handler"""
        print 'karl'
        print msg
        print camera
        # camera.capture('/tmp/test.jpeg', 'jpeg', True);
        try:
            image = get_image_as_array(camera, raw_capture)
            find_faces_in_image(image)
            raise RuntimeError('all done')
        finally:
            # cv2.destroyAllWindows();
            camera.close()
            sys.exit()
        #try:
            #start = time.time();
            #end = time.time();
            #raise RuntimeError('test');
        #except Exception:
            #print 'err';
        #finally:
            #print 'exiting';
            #camera.close();
            #sys.exit();
    tests_messages.subscribe(on_msg)

def main():
    """kick this party off"""
    EVENT_BUS.connect(ENDPOINT_ID, start)
    print 'running'


if __name__ == '__main__':
    main()
    ioloop.IOLoop.instance().start()
