import { combineEpics } from 'redux-observable';
import { Action, combineReducers } from 'redux';
import calendarReducer, { fetchEventsEpic } from './calendar';
import weatherReducer, { fetchWeatherEpic, monitorWeatherEpic } from './weather';

export const rootEpic = combineEpics(
	fetchEventsEpic,
	fetchWeatherEpic,
	monitorWeatherEpic
);

const SET_MODE = 'SET_MODE';
const initialState = {
	mode: 'auto',
	data: null,
};
function modeReducer (state = initialState, action: any) {
	switch (action.type) {
	case SET_MODE:
		return {
			mode: action.payload.mode,
			data: action.payload.data || null,
		};
	default:
		return state;
	}
}

export const rootReducer = combineReducers({
	mode: modeReducer,
	calendar: calendarReducer,
	weather: weatherReducer,
});
