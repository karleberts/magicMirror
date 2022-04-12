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
import numpy as np
from base64 import b64encode
try:
    from picamera.array import PiRGBArray
    from picamera import PiCamera
except ImportError:
    print("PiCamera not installed")
from tornado import ioloop
from rx.subjects import Subject
from rx import Observable
try:
    import asyncio
    from tornado.platform.asyncio import AnyThreadEventLoopPolicy
    asyncio.set_event_loop_policy(AnyThreadEventLoopPolicy())
except ImportError:
    print("asyncio not found")

DIRNAME = os.path.dirname(__file__)
try:
    EVENT_BUS = imp.load_source('client', os.path.join(DIRNAME, '..', '..', '..', 'event-bus', 'client.py'))
except IOError:
    #legacy file location
    EVENT_BUS = imp.load_source('client', os.path.join(DIRNAME, '..', '..', 'node_modules', 'event-bus', 'client.py'))
try:
    CONFIG_FILE = open(os.path.join(DIRNAME, '..', '..', '..', 'config.json'), 'r')
except IOError:
    #legacy file location
    CONFIG_FILE = open(os.path.join(DIRNAME, '..', '..', 'config.json'), 'r')

CASCADE_PATH = os.path.join(DIRNAME, 'haarcascade_frontalface_default.xml')
CONFIG = json.load(CONFIG_FILE)
FACE_CASCADE = cv2.CascadeClassifier(CASCADE_PATH)
ENDPOINT_ID = 'faceDetect'
CAMERA_INST = None
CAPTURE_POOL = []
CAPTURE_POOL_INDEX = 0
CAPTURE_INTERVAL = 350
FRAME_COUNT_UNTIL_FALSE = 15 # num. of frames to see 0 faces in until emitting a 'not found' result (~5s?)
SHOW_CV = False

timer = Observable.interval(CAPTURE_INTERVAL)

def get_capture_array(camera):
    """silly array based pool of capture resources"""
    global CAPTURE_POOL
    global CAPTURE_POOL_INDEX
    pool_len = len(CAPTURE_POOL)
    cap = None
    if pool_len < 5:
        CAPTURE_POOL.append(PiRGBArray(camera, size=(480, 368)))
        cap = CAPTURE_POOL[CAPTURE_POOL_INDEX]
    else:
        cap = CAPTURE_POOL[CAPTURE_POOL_INDEX]
        cap.truncate(0)
    CAPTURE_POOL_INDEX = (CAPTURE_POOL_INDEX + 1) % 5
    return cap

def get_image_as_array(camera):
    """grab a frame and convert to a numpy array"""
    if camera is None:
        filename = sys.argv[1] if len(sys.argv) >= 2 else 'snapshot.jpg' 
        image = cv2.imread(os.path.join(DIRNAME, filename))
    else:
        cap = get_capture_array(camera)
        camera.capture(cap, format='bgr', use_video_port=True)
        image = cap.array
    return image

def find_faces_in_image(gray):
    """Find faces in the given opencv numpy array"""
    global SHOW_CV
    # t = time.time()
    # u = time.time()
    # elapsed = u - t
    # print('{} converting to gray'.format(elapsed))
    # t = time.time()
    faces = FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=4,
        minSize=(35, 35)
    )
    if SHOW_CV:
        for (x, y, w, h) in faces:
            cv2.rectangle(gray, (x, y), (x+w, y+h), (255, 0, 0), 2)
        cv2.imshow("image", gray)
    # key = cv2.waitKey(1) & 0xFF
    # u = time.time()
    # elapsed = u - t
    # print('{} searching faces'.format(elapsed))
    return len(faces)

def get_image(x):
    """event_bus message handler"""
    global SHOW_CV
    camera = get_camera()
    result = {}
    if camera is None:
        return result
    try:
        image = get_image_as_array(camera)
        result['img-array'] = image
    except (KeyboardInterrupt, SystemExit):
        raise
    except Exception:
        camera.close()
        ioloop.IOLoop.instance().stop()
        sys.exit()
    return result

def assoc_result(result):
    """do face detection"""
    global SHOW_CV
    # print('doing a face check')
    image = result["img-array"]
    if image is None:
        return result;
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        face_count = find_faces_in_image(gray)
        if SHOW_CV:
            camera.annotate_text = ('analog_gain: {}, brightness: {}, contrast: {}, exposure_speed: {}, faces: {}'
                                    .format(float(camera.analog_gain), float(camera.brightness), camera.brightness, camera.exposure_speed, face_count))
    except (KeyboardInterrupt, SystemExit):
        raise
    except Exception:
        camera.close()
        ioloop.IOLoop.instance().stop()
        sys.exit()
    # print("found {0} faces".format(face_count))
    result["has-faces?"] = face_count > 0
    return result

def get_camera(should_create=True):
    """return or create a camera instance"""
    global CAMERA_INST
    if CAMERA_INST is not None:
        return CAMERA_INST
    elif should_create:
        try:
            CAMERA_INST = PiCamera(resolution='480x368')
            CAMERA_INST.exposure_mode = 'night'
            print('camera created')
            #CAMERA_INST.start_preview()
        except NameError:
            print("Returning null camera")
            CAMERA_INST = None
        return CAMERA_INST
    else:
        return CAMERA_INST

def close_camera():
    """if a camera is instantiated, destroy it"""
    global CAMERA_INST
    global SHOW_CV
    if CAMERA_INST is not None:
        print('closing the camera')
        if SHOW_CV:
            cv2.destroyWindow('image')
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
    ioloop.IOLoop.instance().stop()
    sys.exit()

def handle_debug_req(req):
    global SHOW_CV
    if (SHOW_CV is not req['params']):
        SHOW_CV = req['params']
        if (SHOW_CV):
            print('opening cv window {}'.format(SHOW_CV))
            cv2.namedWindow('image', cv2.WINDOW_NORMAL)
            CAMERA_INST.start_preview()
        else:
            print('closing cv window {}'.format(SHOW_CV))
            cv2.destroyWindow('image')
            CAMERA_INST.stop_preview()

# def test(msg):
#     print('testing a message')
#     print(msg)

def start():
    """Callback when event_bus connection succeeds"""
    print('connected to event bus')
    #close the camera and kill the app on sigterm
    signal.signal(signal.SIGTERM, lambda sig, frame: stop())
    signal.signal(signal.SIGINT, lambda sig, frame: stop())
    pause_stream = (EVENT_BUS.request_stream
                    .filter(lambda req: req['topic'] == 'faceDetect.pause')
                    .map(lambda req: req['params'])
                    .start_with(False)
                    .distinct_until_changed()
                    .publish())
    time.sleep(1)
    last_result = False
    def handle_result(res):
        last_result = res
        EVENT_BUS.send_message('faceDetect.result', res)
    img_stream = timer.map(lambda x: get_image(x)).share()
    result_stream = (img_stream
                     .with_latest_from(pause_stream, lambda x, is_paused: [x, is_paused])
                     .filter(lambda x: x[1] is not True)
                     .map(lambda x: assoc_result(x[0]))
                     .share())
    found_stream = (result_stream
                    .filter(lambda x: x["has-faces?"] is True)
                    .map(lambda x: True))
    not_found_stream = (result_stream.scan(lambda acc, x: ([x] + acc)[:FRAME_COUNT_UNTIL_FALSE], [])
                        .filter(lambda buf: all(result["has-faces?"] is False for result in buf))
                        .map(lambda res: False))
    brightness_stream = (img_stream
                         .filter(lambda x, i: i % 15 == 0)
                         .map(lambda x: cv2.cvtColor(x["img-array"], cv2.COLOR_BGR2HSV))
                         .map(lambda hsv: cv2.mean(hsv)[2] / 255)
                         .subscribe(lambda brightness: EVENT_BUS.send_message('faceDetect.brightness', brightness)))
    (Observable.merge(found_stream, not_found_stream)
     .distinct_until_changed()
     .subscribe(handle_result))
    pause_stream.connect()

    #show/hide the debug window
    (EVENT_BUS.request_stream
     .filter(lambda req: req['topic'] == 'faceDetect.showDebug')
     .subscribe(handle_debug_req))

    (EVENT_BUS.request_stream
     .filter(lambda req: req['topic'] == 'faceDetect.getStatus')
     .subscribe(lambda req: req['respond'](last_result)))

    (EVENT_BUS.request_stream
     .filter(lambda req: req['topic'] == 'faceDetect.getImage')
     .subscribe(lambda req: result_stream
      .take(1)
      .map(lambda result: cv2.imencode('.jpg', result['img-array'])[1])
      .map(lambda encoded: b64encode(np.array(encoded).tostring()).decode('ascii'))
      .subscribe(lambda msg: req['respond'](msg))))

    EVENT_BUS.send_message('faceDetect.ready', True, 'magicMirror')


def main():
    """kick this party off"""
    EVENT_BUS.connect(ENDPOINT_ID, start)
    ioloop.IOLoop.current(True).start()
    #ioloop.IOLoop.instance().start()
    print('running')

if __name__ == '__main__':
    main()
