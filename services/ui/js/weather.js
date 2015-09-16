"use strict";
const Promise = require('bluebird');
const RxReact = require('rx-react');
const React = require('react');
const Rx = require('rx');
const $ = require('jquery');
const moment = require('moment');
const querystring = require('querystring');

const config = gData.config;
//TODO- create an 'error' service that sends me emails/texts (debounced 1/hr) on any kind of error -
//should listen to 'error' events on the bus...
//TODO- any api or other errors should raise errors on the bus

let weather = {
	'sunrise' : moment(),
	'sunset' : moment(),
	'moonPhaseClassName' : '',
	'currentTemp' : '?',
	'maxTemp' : '?',
	'minTemp' : '?',
	'icon' : 'wi-alien',
	'upcoming' : []
};
let fetched;


/**
 * Refresh data from the servers if a sufficient amount of time has passed
 */
function request () {
	//forecast.io uses a 'route with a /forecast' root and '/LAT,LONG'
	//var forecastUrl = 'https://api.forecast.io/forecast/' + config.apiKeys.forecastIo;
	//forecastUrl += '/' + config.weather.lat + ',' + config.weather.long;
	//!!for now forecast.io reqs are routed through a node proxy b/c forecast.io does not allow CORS
	let forecastUrl = '/forecastIoProxy';
	let now = moment();
	if (fetched &&
			(fetched.isAfter(now.subtract(30, 'minutes'))) &&
			(Math.abs(fetched.diff(now, 'days')) === 0)){
		//only re-request if the last fetch was > 30 min ago OR on a different day
		return Promise.resolve(weather);
	} else {
		return Promise.resolve($.ajax({
			'url'		: forecastUrl,
			'method'	: 'get'
		}))
			.then(response => {
				let forecast = JSON.parse(response);
				let currently = forecast.currently;
				let today = forecast.daily.data[0];
				fetched = moment();
				let currentTemp = Math.round(currently.temperature);
				let moonPhaseIconClass = moonPhases[Math.round(today.moonPhase / (1/28))];
				weather = {
					'sunrise'				: moment.unix(today.sunriseTime),
					'sunset'				: moment.unix(today.sunsetTime),
					'moonPhaseClassName'	: moonPhaseIconClass,
					'icon'					: iconTable[today.icon] || 'wi-alien',
					'currentTemp'			: currentTemp,
					'maxTemp'				: Math.round(today.temperatureMax),
					'minTemp'				: Math.round(today.temperatureMin),
					'upcoming'				: [],
				};
				for (let i = 1; i < 4; i++) {
					weather.upcoming.push({
						'date'	: moment().add(i, 'days').format('M/D'),
						'temp'	: Math.round(forecast.daily.data[i].temperatureMax),
						'icon'	: iconTable[forecast.daily.data[i].icon] || 'wi-alien',
					});
				}
				return weather;
			})
			.catch(err => {
				//TODO- raise the err w/ the error service over the bus
				//for now I'm just gonna rethrow
				throw err;
			});
	}
}

class Weather extends RxReact.Component {
	constructor (props) {
		super(props);
		this.state = {
			'weather' : weather
		};
	}

	getStateStream () {
		return Rx.Observable.interval(600000)
			.startWith(true)
			.flatMap(() => Rx.Observable.fromPromise(request()))
			.map(weather => ({'weather' : weather}));
	}

	render () {
		const weather = this.state.weather;
		const upcoming = weather.upcoming.map(up => {
			return (
				<div>
					<i className="wi {up.icon}"></i>
					<span className="date">{up.date}</span>
					<span className="temp">{up.temp}<i className="wi wi-degrees"></i></span>
				</div>
			);
		});
		return (
			<div id="weatherContainer">
				<div className="sun">
					<i className="wi wi-sunrise"></i>
					<span>{weather.sunrise.format('h:mma')}</span>
					<i className="wi wi-sunset"></i>
					<span>{weather.sunset.format('h:mma')}</span>
					<i className="moonPhase wi {weather.moonPhaseClassName}"></i>
				</div>
				<div className="current">
					<i className="currentIcon wi {weather.icon}"></i>
					<div className="currentTemp">
						{weather.currentTemp}<i className="wi wi-degrees"></i>
					</div>
					<div className="hilo">
						<div>{weather.maxTemp}<i className="wi wi-degrees"></i></div>
						<div>{weather.minTemp}<i className="wi wi-degrees"></i></div>
					</div>
				</div>
				<div className="upcoming">
					{upcoming}
				</div>
			</div>
		);
	}
}

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
//var iconTable = {
	//'01d':'wi-day-sunny',
	//'02d':'wi-day-cloudy',
	//'03d':'wi-cloudy',
	//'04d':'wi-cloudy-windy',
	//'09d':'wi-showers',
	//'10d':'wi-rain',
	//'11d':'wi-thunderstorm',
	//'13d':'wi-snow',
	//'50d':'wi-fog',
	//'01n':'wi-night-clear',
	//'02n':'wi-night-cloudy',
	//'03n':'wi-night-cloudy',
	//'04n':'wi-night-cloudy',
	//'09n':'wi-night-showers',
	//'10n':'wi-night-rain',
	//'11n':'wi-night-thunderstorm',
	//'13n':'wi-night-snow',
	//'50n':'wi-night-alt-cloudy-windy',
//};

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

function toTitleCase (str) {
	return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

module.exports = Weather;
