"use strict";
var Promise = require('bluebird');
var $ = require('jquery');
var moment = require('moment');
var config = gData.config;

var tmpl = require('../tmpl/calendar.hbs');

var CLIENT_ID = config.apiKeys.google.clientId;
var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
var intervals = {};
var $container;


function init ($el) {
	$container = $el;
	$container.append(render());
	setupUpdateIntervals();
	return refreshEvents();
}

function refreshEvents () {
	getEvents()
		.then(function (events) {
			var $eventsList = $('<div>')
				.append(render(events))
				.find('.events')
				.detach();
			$container
				.find('.events')
				.replaceWith($eventsList);
		});
}

function getEvents () {
	return Promise.resolve($.ajax({
		'url'		: '/calendar',
		'method'	: 'get'
	}))
		.then(function (response) {
			var gCal = response[0];
			return gCal.items;
		})
		.catch(function (err) {
			console.error(err);
		});
}

function setupUpdateIntervals () {
	Object.keys(intervals).forEach(function (i) {
		clearInterval(i);
	});
	intervals.updateDateTime = setInterval(function () {
		$container.find('.date').text(moment().format('dddd MMMM Do'));
		$container.find('.time').text(moment().format('h:mm'));
	}, 500);
	//intervals.updateEvents = setInterval(refreshEvents
}

function render (events) {
	var context = {};
	var list = events || [];
	context.events = list.reduce(function (evts, evt) {
		var startMoment = moment(evt.start.dateTime);
		evts.push({
			'date'		: startMoment.format('M/D'),
			'time'		: startMoment.format('h:mma'),
			'summary'	: evt.summary
		});
		return evts;
	}, []);
	return tmpl(context);
}

module.exports = {
	'init' : init
};
