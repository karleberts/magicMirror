'use strict';
const fetch = require('node-fetch');

const config = require('../config.json');

function cloudflareApi (myIp) {
	const API_KEY = config.apiKeys.cloudflare;
	const EMAIL = 'karl.eberts@gmail.com';
	const ZONE_ID = '75164a28213ae6079eaa59c6be38369e';
	const DNS_REC_ID = '8b8fb531edd1d6cb8b50c61507b06e3c';
	const DOMAIN = 'magicmirror.karleberts.com';

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
