import { Observable, of } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import {
    catchError,
    filter,
    flatMap,
    map,
} from 'rxjs/operators';
import * as R from 'ramda';
import * as moment from 'moment';
import { Action } from 'redux';

const FETCH_EVENTS = 'calendar/FETCH_EVENTS';
const RECEIVE_EVENTS = 'calendar/RECEIVE_EVENTS';

const fetchEvents = () => ({type: FETCH_EVENTS});
const receiveEvents = (events: any) => ({type: RECEIVE_EVENTS, payload: events});

export const actions = {
	fetchEvents,
	receiveEvents,
};

/**
 * Format an event from the api response to relevant display data
 * @param event
 * @returns {{date: *, time: *, summary: (*|summary|any|string|books.summary|string)}}
 */
function formatEvent (event: any) {
	const startMoment = moment(event.start.dateTime);
	return {
		id: event.id,
		date: startMoment.format('M/D'),
		time: startMoment.format('h:mma'),
		summary: event.summary,
	};
}

const formatAndReceive = R.pipe((resp: any) => resp.response.items, R.map(formatEvent), receiveEvents);
export const fetchEventsEpic = (action$: Observable<Action>) => action$.pipe(
    filter(action => action.type === FETCH_EVENTS),
    flatMap(() => ajax({url: '/calendar', responseType: 'json'})),
    map(formatAndReceive),
    catchError(err => of({type: FETCH_EVENTS, error: true, payload: err}))
);

export default function calendarReducer (state = {events: []}, action: any) {
	switch (action.type) {
	case RECEIVE_EVENTS:
		if (action.error) {
			//TODO- raise the err w/ the error service over the bus
			console.error(action.error);
			return state;
		}
		return {
		    ...state,
			events: action.payload,
		};
	default:
		return state;
	}
}
