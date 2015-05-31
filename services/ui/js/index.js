"use strict";

var $ = require('jquery');
var Promise = require('bluebird');
var weather = require('./weather');
var googleApiPromise = require('google-client-api');

Promise.all([
	function () {
		return new Promise(function (res, rej) {
			$(document).ready(res);
		});
	},
	googleApiPromise(),
])
.then(function (results) {
	var gapi = results[1];
	console.log(gapi);
	var $el = $('#content');
	var $weatherContainer = $('<div>')
		.attr('id', 'weatherContainer')
		.appendTo($el);
	weather.init($weatherContainer);
});
