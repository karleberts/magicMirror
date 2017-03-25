const { execSync } = require('child_process');

function sleepHdmi () {
	execSync('tvservice -o', err => {
		if (err) { throw(err); }
	});
}

function wakeHdmi () {
	execSync('tvservice -p', err => {
		if (err) { throw(err); }
	});
}

module.exports = {sleepHdmi, wakeHdmi};
