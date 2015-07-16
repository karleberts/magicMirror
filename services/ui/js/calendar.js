"use strict";
const Promise = require('bluebird');
const $ = require('jquery');
const moment = require('moment');
const config = gData.config;

const tmpl = require('../tmpl/calendar.hbs');

const CLIENT_ID = config.apiKeys.google.clientId;
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
let intervals = {};
let $container;


function init ($el) {
	$container = $el;
	$container.append(render());
	setupUpdateIntervals();
	return refreshEvents();
}

function refreshEvents () {
	getEvents()
		.then((events) => {
			let $eventsList = $('<div>')
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
		.then((response) => {
			let gCal = response[0];
			return gCal.items;
		})
		.catch((err) => {
			console.error(err);
		});
}

function setupUpdateIntervals () {
	Object.keys(intervals).forEach((i) => {
		clearInterval(i);
	});
	intervals.updateDateTime = setInterval(() => {
		$container.find('.date').text(moment().format('dddd MMMM Do'));
		$container.find('.time').text(moment().format('h:mm'));
	}, 500);
	//intervals.updateEvents = setInterval(refreshEvents
}

function render (events) {
	let context = {};
	let list = events || [];
	context.events = list.reduce((evts, evt) => {
		let startMoment = moment(evt.start.dateTime);
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
