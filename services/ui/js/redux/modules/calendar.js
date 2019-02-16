'use strict';
const { Observable } = require('rxjs');
const R = require('ramda');
const update = require('react-addons-update');
const moment = require('moment');

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
	const startMoment = moment(event.start.date);
	return {
		id: event.id,
		date: startMoment.format('M/D'),
		time: startMoment.format('h:mma'),
		summary: event.summary,
	};
}

const formatAndReceive = R.pipe(resp => resp.response.items, R.map(formatEvent), receiveEvents);
const fetchEventsEpic = action$ => action$
	.filter(action => action.type === FETCH_EVENTS)
	.flatMap(() => Observable.ajax({url: '/calendar', responseType: 'json'}))
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
