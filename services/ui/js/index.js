"use strict";

var $ = require('jquery');
var Rx = require('rx');
var Promise = require('bluebird');
var weather = require('./weather');
var calendar = require('./calendar');
var eventBus = window.eb = require('../../eventBus/client');
eventBus.connect('magicMirror.ui')
	.then(function () {
		var fooStream = eventBus.subscribe('foo');
		fooStream.subscribe(onFoo);
		setTimeout(function () {
			//eventBus.,
		})
	});
eventBus.requests.subscribe(function ({topic, params, respond}) {
	console.log('captured an evtBus req: ', arguments);
	console.log(topic);
});
function onFoo (msg) {
	console.log('received a foo, ', msg);
}


$(document).ready(function () {
	var $el = $('#content');
	var $weatherContainer = $('<div>')
		.attr('id', 'weatherContainer')
		.appendTo($el);
	var $calendarContainer = $('<div>')
		.attr('id', 'calendarContainer')
		.appendTo($el);
	
	Promise.all([
		weather.init($weatherContainer),
		calendar.init($calendarContainer)
	]);
});
