"use strict";
const Promise = require('bluebird');
const express = require('express');
const Handlebars = require('handlebars');
const rp = require('request-promise');
const fs = Promise.promisifyAll(require('fs'));
// const querystring = require('querystring');
const google = require('googleapis');
const moment = require('moment');
const https = require('https');
const eventBus = require('event-bus/client').default;
const path = require('path');
const cp = require('child_process');
const {
	filter,
} = require('rxjs/operators');

const config = require('../../../config.json');
// const ZIP_CODE = `${config.weather.zip},us`;
const UI_PORT = config.ports.ui;
const UI_URI = `http://localhost:${UI_PORT}`;

const indexTmpl = Handlebars.compile(fs.readFileSync(`${__dirname}/index.hbs`, 'utf8'));

const calendar = google.calendar('v3');
const oAuthClient = new google.auth.OAuth2(
	config.apiKeys.google.clientId, 
	config.apiKeys.google.clientSecret,
	`${UI_URI}/gAuth`
);

const app = express();
app.use(express.static(`${__dirname}/public`));
app.use('/font', express.static(`${__dirname}/font`));

app.get('/', (req, res) => {
	const gData = { config };
	const html = indexTmpl({
		gData	: JSON.stringify(gData)
	});
	res.send(html);
});
app.get('/forecastIoProxy', (req, res) => {
	let url = `https://api.darksky.net/forecast/${config.apiKeys.forecastIo}`;
	url += `/${config.weather.lat},${config.weather.long}`;
	return rp(url)
		.then(resp => res.send(resp));
});
app.get('/calendar', (req, res) => {
	fs.readFileAsync(`${__dirname}/__gapi.json`, 'utf8')
		.catch(err => {
			console.log('no auth info found, doing authentication.', err);
			let url = oAuthClient.generateAuthUrl({
				'access_type'	: 'offline',
				'scope'			: 'https://www.googleapis.com/auth/calendar.readonly'
			});
			res.redirect(url);
		})
		.then(getCalendarEvents)
		.then(events => res.send(events))
		.catch((err) => {
			//TODO- send err over bus to err service
			console.log(err);
			res.status(500)
				.send('Error getting calendar events.');
		});
});
app.get('/gAuth', (req, res) => {
	const { code } = req.params;
	console.log('code', code);
	if (code) {
		oAuthClient.getToken(code, (err, tokens) => {
			if (err) {
				console.log('error authenticating with google', err);
			} else {
				fs.writeFileAsync(`${__dirname}/__gapi.json`, JSON.stringify(tokens))
					.then(() => res.redirect(`${UI_URI}/calendar`));
			}
		});
	}
});

function getCalendarEvents (authContents) {
	const tokens = JSON.parse(authContents);
	oAuthClient.setCredentials(tokens);
	const apiParams = {
		calendarId: config.apiKeys.google.calendarId,
		maxResults: 20,
		orderBy: 'startTime',
		singleEvents: true,
		timeMin: moment().format('YYYY-MM-DD') + 'T' + '00:00:00.000Z',
		timeMax: moment().add(1, 'weeks').format('YYYY-MM-DD') + 'T' + '23:59:59.000Z',
		auth: oAuthClient
	};
	console.log(apiParams);
	return Promise.promisify(calendar.events.list)(apiParams);
}

function playVideo (msg) {
	//hack - should get the real path or stream it
	const src = path.join(__dirname, 'public', msg.params.src);
	const cmd = '/usr/bin/omxplayer';
	const args = [
		'--win', '0,5,1080,1925',
		src
	];
	console.log(cmd, args);
	const proc = cp.spawn(cmd, args, {
		env: {DISPLAY: ':0.0'}
	});
	proc.on('exit', () => {
		console.log('proc done, responding');
		msg.respond(true);
	});
}

const options = {
	key: fs.readFileSync(path.resolve(__dirname, './ws.key')),
	cert: fs.readFileSync(path.resolve(__dirname, './ws.crt')),
};
const httpServer = https.createServer(options, app);
httpServer.listen(UI_PORT);

eventBus.requests.pipe(
	filter(req => req.topic === 'video.play')
).subscribe(playVideo);

eventBus.connect('uiServer')
	.then(() => eventBus.sendMessage('uiServer.ready', true, 'magicMirror'));
