"use strict";
var fs = require('fs');
var child_process = require('child_process');

var vars = require('./vars.json');
//list of all modules we can build
var KEYS = vars.keys;
//make sure all the args are known keys
for (var i = 3; i < process.argv.length; i++) {
	if (!KEYS[process.argv[i]]) {
		throw "Unknown key: " + process.argv[i];
	}
}


var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require("babelify");
var hbsfy = require("hbsfy");

function shouldBuild (key) {
	if ((2 === process.argv.length) ||
			(-1 !== process.argv.indexOf(key))) {
		return true;
	}
	return false;
}


module.exports.browserifyBundles = {};

if (shouldBuild('ui')) {
	console.log('building ui');
	var b = browserify({
		'debug' : true,
		'cache' : {},
		'packageCache' : {}
	})
		.transform(hbsfy)
		.transform(babelify)
		.add(vars.dirs.ui + '/js/index.js');
	b.__outFile = vars.dirs.ui + '/public/bundle.js';
	module.exports.browserifyBundles.ui = b;
	b.bundle()
		.on("error", function (err) { console.log("Error : " + err.message); })
		.pipe(fs.createWriteStream(b.__outFile));
}

if (shouldBuild('css')) {
	var args = [
		vars.dirs.ui + '/scss/main.scss',
		vars.dirs.ui + '/public/main.css'
	];
	if (global.watch) {
		args.unshift('-w');
	}
	child_process.spawn(__dirname + '/../node_modules/.bin/node-sass', args);
}
