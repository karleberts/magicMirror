/* global global: true; */
"use strict";

var build = require('./build');
var watchify = require('watchify');
var fs = require('fs');
var vars = require('./vars.json');
global.watch = true;

//start watchifying all the browserify bundles
Object.keys(build.browserifyBundles).forEach(function (key) {
	console.log('Watching ' + key + ' for updates...');

	var b = build.browserifyBundles[key];
	var w = watchify(b);
	w.on('update', function () {
		console.log(key + ' updated, rebuilding...');
		w.bundle()
			.on("error", function (err) { console.log("Error : " + err.message); })
			.pipe(fs.createWriteStream(b.__outFile))
			.on('finish', function () {
				console.log('done rebuilding ' + key);
			});
	});
});
