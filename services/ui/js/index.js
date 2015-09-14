"use strict";

var $ = require('jquery');
var Rx = require('rx');
var React = require('react');
var Promise = require('bluebird');
var Weather = require('./weather');
var Calendar = require('./calendar');
//TODO- global ref
var eventBus = window.eb = require('../../eventBus/client');
eventBus.connect('magicMirror.ui')
	.then(() => {
		var fooStream = eventBus.subscribe('faceDetect.result');
		fooStream.subscribe(onFoo);
	});
eventBus.requests.subscribe(({topic, params, respond}) => {
	console.log('captured an evtBus req: ', arguments);
	console.log(topic);
});
function onFoo (msg) {
	console.log('received a foo, ', msg);
}



$(document).ready(() => {
	var container = document.getElementById('content');
	//React.render(<Weather></Weather>, container);
	React.render(<Calendar></Calendar>, container);
	//var $el = $('#content');
	//var $weatherContainer = $('<div>')
	//	.attr('id', 'weatherContainer')
	//	.appendTo($el);
	//var $calendarContainer = $('<div>')
	//	.attr('id', 'calendarContainer')
	//	.appendTo($el);
	//
	//Promise.all([
	//	weather.init($weatherContainer),
	//	calendar.init($calendarContainer)
	//]);

});
