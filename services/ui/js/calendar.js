"use strict";
const Promise = require('bluebird');
const $ = require('jquery');
const moment = require('moment');
const React = require('react');
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
		.then((response) => {
			let gCal = response[0];
			return gCal.items
				.map((event) => (formatEvent(event)));
		})
		.catch((err) => {
			console.error(err);
		});
}

class Calendar extends React.Component {
	constructor (props) {
		super(props);

		let m = moment();
		this.state = {
			'date'		: m.format('dddd MMMM Do'),
			'time'		: m.format('h:mm'),
			'events'	: []
		};
		this.dateTimeSequence = Rx.Observable.interval(500)
			.startWith(true);
		//TODO- 5min? should also use a webhook for instant updates plz
		//merge seq w/ webhook update seq or something
		this.eventSequence = Rx.Observable.interval(300000)
			.startWith(true)
			.flatMap(getEvents);
	}

	componentDidMount () {
		this.unmounted = new Rx.Subject()
			.take(1);
		//update date/time using rx.interval
		this.dateTimeSequence
			.takeUntil(this.unmounted)
			.subscribe(() => {
				let m = moment();
				this.setState({
					'date' : m.format('dddd MMMM Do'),
					'time' : m.format('h:mm')
				});
			});

		this.eventSequence
			.takeUntil(this.unmounted)
			.subscribe((events) => {
				this.setState({'events' : events});
			});
	}
	componentWillUnmount () {
		//cancel observables (date/time/eventSequence)
		this.unmounted.onNext();
	}
	render () {
		let events = this.state.events.map((event) => (
			<li>
				<span className="eventDate">{event.date}</span>
				<span className="eventSummary">{event.summary}</span>
				<span className="eventTime">({event.time})</span>
				<div className="clear"></div>
			</li>
		));

		return (
			<div id="calendarContainer">
				<div className="date">{this.state.date}</div>
				<div className="time">{this.state.time}</div>
				<ul className="events">
					{events}
				</ul>
			</div>
		);
	}
}

module.exports = Calendar;
