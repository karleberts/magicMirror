"use strict";
var Promise = require('bluebird');
var template = require('../tmpl/weather.hbs');
var $ = require('jquery');
var querystring = require('querystring');
var config = gData.config.weather;


function get () {
	var url = 'http://api.openweathermap.org/data/2.5/weather';
	url += '?' + querystring.stringify({
		'zip' : config.zip,
		'APPID' : 'a89073c8789947a7ba36be55d7d38ae6'
	});
	return Promise.resolve($.ajax({
		'url'		: url,
		'method'	: 'get'
	}));
}

function render (p) {
	return template({
		'content' : JSON.stringify(p)
	});
}

function init () {
	get()
	.then(render)
	.then(function (result) {
		console.log(result);
	});
}

module.exports.init = init;
