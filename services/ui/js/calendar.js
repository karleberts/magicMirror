"use strict";
const Promise = require('bluebird');
const $ = require('jquery');
const moment = require('moment');
const RxReact = require('rx-react');
const React = require('react/addons');
const ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;
const Rx = require('rx');
const R = require('ramda');
const config = gData.config;

const CLIENT_ID = config.apiKeys.google.clientId;
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

/**
 * Format an event from the api response to relevant display data
 * @param event
 * @returns {{date: *, time: *, summary: (*|summary|any|string|books.summary|string)}}
 */
function formatEvent (event) {
	let startMoment = moment(event.start.dateTime);
	return {
		'id'		: event.id,
		'date'		: startMoment.format('M/D'),
		'time'		: startMoment.format('h:mma'),
		'summary'	: event.summary
	};
}

/**
 * Get a formatted event list using the proxy route
 * @returns {Promise.<T>|Promise<U>}
 */
function getEvents () {
	return Promise.resolve($.ajax({
		'url'		: '/calendar',
		'method'	: 'get'
	}))
		.then(response => {
			let gCal = response[0];
			return gCal.items
				.map(event => formatEvent(event));
		})
		.catch(err => {
			console.error(err);
		});
}

class Calendar extends RxReact.Component {
	constructor (props) {
		super(props);

		let m = moment();
		this.state = {
			'dateTime'	: {
				'date'		: m.format('dddd MMMM Do'),
				'time'		: m.format('h:mm'),
			},
			'events'	: []
		};
	}

	getStateStream () {
		let dateTimeSequence = Rx.Observable.interval(500)
			.startWith(true)
			.map(() => {
				let m = moment();
				return {
					'date' : m.format('dddd MMMM Do'),
					'time' : m.format('h:mm')
				};
			});
		//TODO- 5min? should also use a webhook for instant updates plz
		//merge seq w/ webhook update seq or something
		let eventSequence = Rx.Observable.interval(300000)
			.startWith(true)
			.flatMap(getEvents);

		return Rx.Observable.combineLatest(
			dateTimeSequence,
			eventSequence,
			(dateTime, events) => ({
				'dateTime' : dateTime,
				'events' : events
			})
		)
	}

	render () {
		let events = this.state.events.map(event => (
			<li>
				<span className="eventDate">{event.date}</span>
				<span className="eventSummary">{event.summary}</span>
				<span className="eventTime">({event.time})</span>
				<div className="clear"></div>
			</li>
		));

		return (
			<div id="calendarContainer">
				<div className="date">{this.state.dateTime.date}</div>
				<div className="time">{this.state.dateTime.time}</div>
				<ul className="events">
					{events}
				</ul>
			</div>
		);
	}
}

module.exports = Calendar;
