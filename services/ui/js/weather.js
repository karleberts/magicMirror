"use strict";
var Promise = require('bluebird');
var $ = require('jquery');
var moment = require('moment');
var querystring = require('querystring');
var Handlebars = require('hbsfy/runtime');
Handlebars.registerHelper('debug', function () {
	debugger;
});


var template = require('../tmpl/weather.hbs');
var config = gData.config;
//TODO- create an 'error' service that sends me emails/texts (debounced 1/hr) on any kind of error -
//should listen to 'error' events on the bus...
//TODO- any api or other errors should raise errors on the bus

var weather,
	fetched,
	$container;


/**
 * Refresh data from the servers if a sufficient amount of time has passed
 */
function request () {
	//forecast.io uses a 'route with a /forecast' root and '/LAT,LONG'
	//var forecastUrl = 'https://api.forecast.io/forecast/' + config.apiKeys.forecastIo;
	//forecastUrl += '/' + config.weather.lat + ',' + config.weather.long;
	//!!for now forecast.io reqs are routed through a node proxy b/c forecast.io does not allow CORS
	var forecastUrl = '/forecastIoProxy';
	var now = moment();
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
			.then(function (response) {
				var forecast = JSON.parse(response);
				var currently = forecast.currently;
				var today = forecast.daily.data[0];
				fetched = moment();
				var currentTemp = Math.round(currently.temperature);
				var moonPhaseIconClass = moonPhases[Math.round(today.moonPhase / (1/28))];
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
				for (var i = 1; i < 4; i++) {
					weather.upcoming.push({
						'date'	: moment().add(i, 'days').format('M/D'),
						'temp'	: Math.round(forecast.daily.data[i].temperatureMax),
						'icon'	: iconTable[forecast.daily.data[i].icon] || 'wi-alien',
					});
				}
				return weather;
			})
			.catch(function (err) {
				//TODO- raise the err w/ the error service over the bus
				//for now I'm just gonna rethrow
				throw err;
			});
	}
}

function render (weather) {
	return template({
		'sunrise'		: weather.sunrise.format('h:mma'),
		'sunset'		: weather.sunset.format('h:mma'),
		'moonPhase'		: weather.moonPhaseClassName,
		'currentIcon'	: weather.icon,
		'currentTemp'	: weather.currentTemp,
		'maxTemp'		: weather.maxTemp,
		'minTemp'		: weather.minTemp,
		'upcoming'		: weather.upcoming
	});
}

function init ($el) {
	$container = $el;
	return request()
		.then(function (result) {
			$container.append(render(result));
		});
}

function refresh () {
	return request()
		.then(function (result) {
			$container.append(render(result));
		});
}
function show () {
	if (!$container.is(':visible')) {
		return new Promise(function (resolve, reject) {
			$container.fadeIn({
				'complete'	: resolve
			});
		});
	} else {
		return Promise.resolve();
	}
}

function processWeatherId () {
	var id = weather.id;
	var desc;
	if (/^2..$/.test(id)) {
		desc = 'thunderstorm';
	}
	if (/^3..$/.test(id)) {
		desc = 'drizzle';
	}
	if (/^5..$/.test(id)) {
		if ('500' === id) {
			desc = 'drizzle';
		} else if (id === '511') {
			desc = 'freezing rain';
		} else  {
			desc = 'rain';
		}
	}
	if (/^6..$/.test(id)) {
		if ('600' === id) {
			desc = 'snow shower';
		} else if (/61[256]/.test(id) || /62[012]/.test(id)) {
			desc = 'wintry mix';
		} else  {
			desc = 'snow';
		}
	}
	if (/^7..$/.test(id)) {
		desc = 'haze';
	}
	if (/^8..$/.test(id)) {
		if ('800' === id) {
			desc = 'snow shower';
		} else if (/61[256]/.test(id) || /62[012]/.test(id)) {
			desc = 'wintry mix';
		} else  {
			desc = 'cloudy';
		}
	}
	return toTitleCase(desc);
}

var iconTable = {
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

var moonPhases = [
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
	return str.replace(/\w\S*/g, function (txt) {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});
}

module.exports = {
	'init'		: init,
	'request'	: request,
	'render'	: render,
	'get'		: function () {
		return weather;
	}
};
