const { combineEpics } = require('redux-observable');
const { combineReducers } = require('redux');
const calendarReducer = require('./calendar');
const { fetchEventsEpic } = calendarReducer;
const weatherReducer =require('./weather');
const { fetchWeatherEpic, monitorWeatherEpic } = weatherReducer;

const rootEpic = combineEpics(
	fetchEventsEpic,
	fetchWeatherEpic,
	monitorWeatherEpic
);

const SET_MODE = 'SET_MODE';
const initialState = {
	mode: 'auto',
	data: null,
};
function modeReducer (state = initialState, action) {
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

const rootReducer = combineReducers({
	mode: modeReducer,
	calendar: calendarReducer,
	weather: weatherReducer,
});

module.exports = {rootEpic, rootReducer};