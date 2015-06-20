"use strict";

var $ = require('jquery');
var Promise = require('bluebird');
var weather = require('./weather');
var calendar = require('./calendar');
var Rx = require('rx');
var Rxjq = require('rx-jquery');

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
