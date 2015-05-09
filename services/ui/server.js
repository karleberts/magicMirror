var Promise = require('bluebird');
var express = require('express');
var Handlebars = require('handlebars');
var rp = require('request-promise');
var fs = Promise.promisifyAll(require('fs'));
var querystring = require('querystring');

var config = require('../../config.json');
var ZIP_CODE = config.weather.zip + ',us';

var indexTmpl = Handlebars.compile(fs.readFileSync('index.hbs', 'utf8'));

var app = express();
app.use(express.static('public'));

app.get('/', function (req, res) {
	var gData = {
		'config'	: config
	};
	var html = indexTmpl({
		'gData'	: JSON.stringify(gData)
	});
	res.send(html);
});
app.get('/weather', function (req, res) {
	var url = 'http://api.openweathermap.org/data/2.5/weather';
	url += '?' + querystring.stringify({
		'zip' : ZIP_CODE
	});
	return rp(url)
	.then(function (resp) {
		res.send(resp);
	});
});

app.listen(8888);
console.log('listening');
