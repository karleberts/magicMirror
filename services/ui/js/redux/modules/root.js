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

const rootReducer = combineReducers({
	calendar: calendarReducer,
	weather: weatherReducer,
});

module.exports = {rootEpic, rootReducer};