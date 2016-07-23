'use strict';
const { Observable } = require('rxjs');
const R = require('ramda');
const rp = require('request-promise');
const update = require('react-addons-update');
const moment = require('moment');

const qualifyUrl = require('../../libs/qualifyUrl');

const FETCH_EVENTS = 'calendar/FETCH_EVENTS';
const RECEIVE_EVENTS = 'calendar/RECEIVE_EVENTS';

const fetchEvents = () => ({type: FETCH_EVENTS});
const receiveEvents = events => ({type: RECEIVE_EVENTS, payload: events});

const actions = {
	fetchEvents,
	receiveEvents,
};

/**
 * Format an event from the api response to relevant display data
 * @param event
 * @returns {{date: *, time: *, summary: (*|summary|any|string|books.summary|string)}}
 */
function formatEvent (event) {
	const startMoment = moment(event.start.dateTime);
	return {
		id: event.id,
		date: startMoment.format('M/D'),
		time: startMoment.format('h:mma'),
		summary: event.summary,
	};
}

/**
 * Get a formatted event list using the proxy route
 * @returns {Promise.<T>|Promise<U>}
 */
function getEvents () {
	return rp(qualifyUrl('/calendar'))
		.then(response => JSON.parse(response).items);
}

const formatAndReceive = R.pipe(R.map(formatEvent), receiveEvents);
const fetchEventsEpic = action$ => action$
	.filter(action => action.type === FETCH_EVENTS)
	.flatMap(getEvents)
	.map(formatAndReceive)
	.catch(err => Observable.of({type: FETCH_EVENTS, error: true, payload: err}));

function calendarReducer (state = {events: []}, action) {
	switch (action.type) {
	case RECEIVE_EVENTS:
		if (action.error) {
			//TODO- raise the err w/ the error service over the bus
			console.error(action.error);
			return state;
		}
		return update(state, {
			events: {$set: action.payload},
		});
	default:
		return state;
	}
}

module.exports = Object.assign(calendarReducer, {
	actions,
	fetchEventsEpic
});
