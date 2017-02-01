'use strict';
const fetch = require('node-fetch');

const config = require('../config.json');

function cloudflareApi (myIp) {
	const API_KEY = config.apiKeys.cloudflare;
	const EMAIL = '***REMOVED***';
	const ZONE_ID = '***REMOVED***';
	const DNS_REC_ID = '***REMOVED***';
	const DOMAIN = '***REMOVED***';

	const headers = new fetch.Headers({
		'X-Auth-Email': EMAIL,
		'X-Auth-Key': API_KEY,
		'Content-Type': 'application/json',
	});

	const body = JSON.stringify({
		type: 'A',
		name: DOMAIN,
		content: myIp,
		proxied: true
	});

	const url = `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${DNS_REC_ID}`;
	const apiRequest = new fetch.Request(url, {
		method: 'PUT',
		headers,
		body
	});

	return fetch(apiRequest);
}

function update () {
	return fetch('https://api.ipify.org?format=json')
		.then(response => response.json())
		.then(data => {
			const ip = data.ip.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)[0];
			if (ip) {
				return cloudflareApi(ip);
			}
		});
}

module.exports = update;
