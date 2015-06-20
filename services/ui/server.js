var Promise = require('bluebird');
var express = require('express');
var Handlebars = require('handlebars');
var rp = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));
var querystring = require('querystring');
var google = require('googleapis');
var moment = require('moment');

var config = require('../../config.json');
const ZIP_CODE = config.weather.zip + ',us';
const UI_PORT = config.ports.ui;
const UI_URI = 'http://localhost:' + UI_PORT;

var indexTmpl = Handlebars.compile(fs.readFileSync(__dirname + '/index.hbs', 'utf8'));

var calendar = google.calendar('v3');
var oAuthClient = new google.auth.OAuth2(
	config.apiKeys.google.clientId, 
	config.apiKeys.google.clientSecret,
	UI_URI + '/gAuth'
);
var authed = false;

var app = express();
app.use(express.static(__dirname + '/public'));
app.use('/font', express.static(__dirname + '/font'));

app.get('/', function (req, res) {
	var gData = {
		'config'	: config
	};
	var html = indexTmpl({
		'gData'	: JSON.stringify(gData)
	});
	res.send(html);
});
app.get('/forecastIoProxy', function (req, res) {
	 var url = 'https://api.forecast.io/forecast/' + config.apiKeys.forecastIo;
	 url += '/' + config.weather.lat + ',' + config.weather.long;
	return rp(url)
	.then(function (resp) {
		res.send(resp);
	});
});
app.get('/calendar', function (req, res) {
	fs.readFileAsync(__dirname + '/__gapi.json', 'utf8')
		.catch(function (err) {
			console.log('no auth info found, doing authentication.', err);
			var url = oAuthClient.generateAuthUrl({
				'access_type'	: 'offline',
				'scope'			: 'https://www.googleapis.com/auth/calendar.readonly'
			});
			res.redirect(url);
		})
		.then(getCalendarEvents)
		.then(function (events) {
			res.send(events);
		})
		.catch(function (err) {
			//TODO- send err over bus to err service
			console.log(err);
			res.status(500)
				.send('Error getting calendar events.');
		});
});
app.get('/gAuth', function (req, res) {
	var code = req.param('code');
	console.log('code', code);
	if (code) {
		oAuthClient.getToken(code, function (err, tokens) {
			if (err) {
				console.log('error authenticating with google', err);
			} else {
				fs.writeFileAsync(__dirname + '/__gapi.json', JSON.stringify(tokens))
					.then(function () {
						res.redirect(UI_URI + '/calendar');
					});
			}
		});
	}
});

function getCalendarEvents (authContents) {
	var tokens = JSON.parse(authContents);
	oAuthClient.setCredentials(tokens);
	var apiParams = {
		'calendarId'	: config.apiKeys.google.calendarId,
		'maxResults'	: 20,
		'orderBy'		: 'startTime',
		'singleEvents'	: true,
		'timeMin'		: moment().format('YYYY-MM-DD') + 'T' + '00:00:00.000Z',
		'timeMax'		: moment().add(1, 'weeks').format('YYYY-MM-DD') + 'T' + '23:59:59.000Z',
		'auth'			: oAuthClient
	};
	console.log(apiParams);
	return Promise.promisify(calendar.events.list)(apiParams);
}

app.listen(UI_PORT);
console.log('listening');
