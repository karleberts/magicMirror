from __future__ import print_function
#import ptvsd
#ptvsd.enable_attach("my_secret", address = ('0.0.0.0', 3000))
#ptvsd.wait_for_attach()
"""detect faces and report to the event_bus"""
import json
import imp
# import io
import os
import signal
import sys
import time
import cv2
from picamera.array import PiRGBArray
from picamera import PiCamera
import picamera
from tornado import ioloop
from rx.subjects import Subject
from rx import Observable

DIRNAME = os.path.dirname(__file__)
EVENT_BUS = imp.load_source('client', os.path.join(DIRNAME, '..', 'eventBus', 'client.py'))
CONFIG_FILE = open(os.path.join(DIRNAME, '..', '..', 'config.json'), 'r')
CASCADE_PATH = os.path.join(DIRNAME, 'haarcascade_frontalface_default.xml')
CONFIG = json.load(CONFIG_FILE)
FACE_CASCADE = cv2.CascadeClassifier(CASCADE_PATH)
ENDPOINT_ID = 'faceDetect'
CAMERA_INST = None
RAW_CAPTURE = None
CAPTURE_INTERVAL = 350
FRAME_COUNT_UNTIL_FALSE = 15 # num. of frames to see 0 faces in until emitting a 'not found' result (~5s?)

timer = Observable.interval(CAPTURE_INTERVAL)

def get_image_as_array(camera):
    """grab a frame and convert to a numpy array"""
    # image = cv2.imread(os.path.join(DIRNAME, 'snapshot.jpg'))
    # raw_capture = PiRGBArray(camera)
    # t = time.time()
    camera.capture(RAW_CAPTURE, format='bgr', use_video_port=True)
    image = RAW_CAPTURE.array
    # u = time.time()
    # elapsed = u - t
    # print('{} capture'.format(elapsed))
    return image
def find_faces_in_image(image):
    """Find faces in the given opencv numpy array"""
    # t = time.time()
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # u = time.time()
    # elapsed = u - t
    # print('{} converting to gray'.format(elapsed))
    # t = time.time()
    faces = FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=2,
        minSize=(30, 30)
    )
    # for (x, y, w, h) in faces:
        # cv2.rectangle(gray, (x, y), (x+w, y+h), (255, 0, 0), 2)
    # cv2.imshow("image", gray)
    # key = cv2.waitKey(1) & 0xFF
    # u = time.time()
    # elapsed = u - t
    # print('{} searching faces'.format(elapsed))
    return len(faces)
def do_face_check():
    """event_bus message handler"""
    global RAW_CAPTURE
    camera = get_camera()
    try:
        image = get_image_as_array(camera)
        face_count = find_faces_in_image(image)
        RAW_CAPTURE.truncate(0)
        camera.annotate_text = ('analog_gain: {}, brightness: {}, contrast: {}, exposure_speed: {}, faces: {}'
                                .format(float(camera.analog_gain), float(camera.brightness), camera.brightness, camera.exposure_speed, face_count))
    except (KeyboardInterrupt, SystemExit):
        raise
    except Exception:
        camera.close()
        sys.exit()
    # print("found {0} faces".format(face_count))
    return face_count > 0

def get_camera(should_create=True):
    """return or create a camera instance"""
    global CAMERA_INST
    global RAW_CAPTURE
    if CAMERA_INST is not None:
        return CAMERA_INST
    elif should_create:
        # cv2.namedWindow('image', cv2.WINDOW_NORMAL)
        CAMERA_INST = PiCamera(resolution='480x368')
        CAMERA_INST.exposure_mode = 'night'
        RAW_CAPTURE = PiRGBArray(CAMERA_INST, size=(480, 368))
        print('camera created')
        # CAMERA_INST.start_preview()
        return CAMERA_INST
    else:
        return CAMERA_INST

def close_camera():
    """if a camera is instantiated, destroy it"""
    global CAMERA_INST
    if CAMERA_INST is not None:
        print('closing the camera')
        # cv2.destroyWindow('image')
        # CAMERA_INST.stop_preview()
        CAMERA_INST.close()
        CAMERA_INST = None

def stop():
    """close the camera and exit the program (handles sigterm)"""
    print('handling stop signal')
    camera = get_camera(False)
    if camera is not None:
        # camera.stop_preview()
        camera.close()
        print('camera closed')
    else:
        print('camera already closed')
    sys.exit()

# def test(msg):
#     print('testing a message')
#     print(msg)

def start():
    """Callback when event_bus connection succeeds"""
    print('connected to event bus')
    #close the camera and kill the app on sigterm
    signal.signal(signal.SIGTERM, lambda sig, frame: stop())
    pause_stream = (EVENT_BUS.request_stream
                    .filter(lambda req: req['topic'] == 'faceDetect.pause')
                    .map(lambda req: req['params'])
                    .start_with(False)
                    .distinct_until_changed()
                    .publish())
    #close the camera if we get paused, create a camera when we get unpaused
    (pause_stream
     .filter(lambda is_paused: is_paused is False)
     .subscribe(lambda is_paused: get_camera()))
    (pause_stream
     .filter(lambda is_paused: is_paused is True)
     .subscribe(lambda is_pause: close_camera()))
    time.sleep(1)
    result_stream = (timer
                     .with_latest_from(pause_stream, lambda x, is_paused: is_paused)
                     .filter(lambda is_paused: is_paused is not True)
                     .map(lambda is_paused: do_face_check())
                     .share())
    found_stream = (result_stream
                    .filter(lambda x: x is True))
    not_found_stream = (result_stream.scan(lambda acc, x: ([x] + acc)[:FRAME_COUNT_UNTIL_FALSE], [])
                        .filter(lambda buf: all(result is False for result in buf))
                        .map(lambda res: False))
    (Observable.merge(found_stream, not_found_stream)
     .distinct_until_changed()
     .subscribe(lambda res: EVENT_BUS.send_message('faceDetect.result', res)))
    pause_stream.connect()
    EVENT_BUS.send_message('faceDetect.ready', True, 'magicMirror')


def main():
    """kick this party off"""
    EVENT_BUS.connect(ENDPOINT_ID, start)
    print('running')


if __name__ == '__main__':
    main()
    ioloop.IOLoop.instance().start()
