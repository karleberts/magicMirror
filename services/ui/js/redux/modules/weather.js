'use strict';
const { Observable } = require('rxjs');
const R = require('ramda');
const moment = require('moment');

const iconTable = {
	'clear-day'				: 'wi-day-sunny',
	'clear-night'			: 'wi-night-clear',
	'rain'					: 'wi-rain',
	'snow'					: 'wi-snow',
	'sleet'					: 'wi-sleet',
	'wind'					: 'wi-windy',
	'fog'					: 'wi-fog',
	'cloudy'				: 'wi-cloudy',
	'partly-cloudy-day'		: 'wi-day-cloudy',
	'partly-cloudy-night'	: 'wi-night-partly-cloudy'
};

const moonPhases = [
	'wi-moon-new',
	'wi-moon-waxing-cresent-1',
	'wi-moon-waxing-cresent-2',
	'wi-moon-waxing-cresent-3',
	'wi-moon-waxing-cresent-4',
	'wi-moon-waxing-cresent-5',
	'wi-moon-waxing-cresent-6',
	'wi-moon-first-quarter',
	'wi-moon-waxing-gibbous-1',
	'wi-moon-waxing-gibbous-2',
	'wi-moon-waxing-gibbous-3',
	'wi-moon-waxing-gibbous-4',
	'wi-moon-waxing-gibbous-5',
	'wi-moon-waxing-gibbous-6',
	'wi-moon-full',
	'wi-moon-waning-gibbous-1',
	'wi-moon-waning-gibbous-2',
	'wi-moon-waning-gibbous-3',
	'wi-moon-waning-gibbous-4',
	'wi-moon-waning-gibbous-5',
	'wi-moon-waning-gibbous-6',
	'wi-moon-3rd-quarter',
	'wi-moon-waning-crescent-1',
	'wi-moon-waning-crescent-2',
	'wi-moon-waning-crescent-3',
	'wi-moon-waning-crescent-4',
	'wi-moon-waning-crescent-5',
	'wi-moon-waning-crescent-6',
];

const initialState = {
	'sunrise' : moment(),
	'sunset' : moment(),
	'moonPhaseClassName' : '',
	'currentTemp' : '?',
	'maxTemp' : '?',
	'minTemp' : '?',
	'icon' : 'wi-alien',
	'upcoming' : []
};

const FETCH_WEATHER = 'weather/FETCH_WEATHER';
const RECEIVE_WEATHER = 'weather/RECEIVE_WEATHER';
const MONITOR_WEATHER = 'weather/MONITOR';
const ABORT_MONITOR = 'weather/ABORT_MONITOR';

const fetchWeather = () => ({type: FETCH_WEATHER});
const receiveWeather = weather => ({type: RECEIVE_WEATHER, payload: weather});
const monitorWeather = () => ({type: MONITOR_WEATHER});
const abortMonitor = () => ({type: ABORT_MONITOR});

const actions = {
	fetchWeather,
	receiveWeather,
	monitorWeather,
	abortMonitor,
};

function format (forecast) {
	const currently = forecast.currently;
	const today = forecast.daily.data[0];
	const currentTemp = Math.round(currently.temperature);
	const moonPhaseIconClass = moonPhases[Math.round(today.moonPhase / (1/28))];
	return {
		sunrise: moment.unix(today.sunriseTime),
		sunset: moment.unix(today.sunsetTime),
		moonPhaseClassName: moonPhaseIconClass,
		icon: iconTable[today.icon] || 'wi-alien',
		currentTemp: currentTemp,
		maxTemp: Math.round(today.temperatureMax),
		minTemp: Math.round(today.temperatureMin),
		upcoming: forecast.daily.data
			.slice(0, 4)
			.map((data, i) => ({
				date: moment().add(i + 1, 'days').format('M/D'),
				temp: Math.round(data.temperatureMax),
				icon: iconTable[data.icon] || 'wi-alien',
			})),
	};
}

//forecast.io uses a 'route with a /forecast' root and '/LAT,LONG'
//var forecastUrl = 'https://api.forecast.io/forecast/' + config.apiKeys.forecastIo;
//forecastUrl += '/' + config.weather.lat + ',' + config.weather.long;
//!!for now forecast.io reqs are routed through a node proxy b/c forecast.io does not allow CORS
const forecastUrl = '/forecastIoProxy';
const formatAndReceive = R.pipe(R.prop('response'), format, receiveWeather);
const fetchWeatherEpic = action$ => action$
	.filter(action => action.type === FETCH_WEATHER)
	.flatMap(() => Observable.ajax({url: forecastUrl, responseType: 'json'}))
	.map(formatAndReceive)
	.catch(err => Observable.of({type: FETCH_WEATHER, error: true, payload: err}));

const timer = Observable.interval(10000)
	.startWith(true);

const monitorWeatherEpic = action$ => action$
	.ofType(MONITOR_WEATHER)
	.flatMap(() => timer)
	.takeUntil(action$.ofType(ABORT_MONITOR))
	.map(fetchWeather);

function weatherReducer (state = initialState, action) {
	switch (action.type) {
	case RECEIVE_WEATHER:
		if (action.error) {
			//TODO- raise the err w/ the error service over the bus
			console.error(action.error);
			return state;
		}
		return action.payload;
	default:
		return state;
	}
}

module.exports = Object.assign(weatherReducer, {
	actions,
	fetchWeatherEpic,
	monitorWeatherEpic,
});
