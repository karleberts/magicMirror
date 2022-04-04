const { exec, execSync } = require('child_process');

function sleepHdmi () {
	console.log('sleeping hdmi');
    try {
        execSync('which vcgencmd');
    } catch (e) {
        console.log('vcgencmd not found, assuming this is a test env');
        return;
    }
    exec('vcgencmd display_power 0', err => {
        if (err) {
            console.error('sleep hdmi err', err);
            throw(err);
        }
    });
}

function wakeHdmi () {
	console.log('waking hdmi');
    try {
        execSync('which vcgencmd');
    } catch (e) {
        console.log('vcgencmd not found, assuming this is a test env');
        return;
    }
	exec('vcgencmd display_power 1', err => {
		if (err) {
			console.error('wake hdmi err', err);
			throw(err);
		}
	});
}


module.exports = {sleepHdmi, wakeHdmi};