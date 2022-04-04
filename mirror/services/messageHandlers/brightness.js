const client = require('../../lib/eventBusClient').getClient();
const { bufferTime } = require('rxjs/operators');
const { set, get, modes } = require('./mode');
const { mean } = require('ramda');


const THRESHOLD = 0.25;
const LOW_BRIGHTNESS_REASON = 'low_brightness';

let wakeMode = null;
let wakeData = null;

client.subscribe('faceDetect.brightness')
    .pipe(
        bufferTime(60000)
    )
    .subscribe(msgs => {
        if (msgs.length < 10) { return; }
        const avgBrightness = mean(msgs.map(msg => msg.data.contents));
        const modeState = get();
        if (avgBrightness > THRESHOLD &&
                modeState.mode === modes.hidden &&
                modeState.data.hideReason === LOW_BRIGHTNESS_REASON) {
            set(wakeMode, wakeData);
        } else if (avgBrightness < THRESHOLD &&
                modeState.mode !== modes.hidden) {
            wakeMode = modeState.mode;
            wakeData = modeState.data;
            set(modes.hidden, {hideReason: LOW_BRIGHTNESS_REASON});
        }
    });