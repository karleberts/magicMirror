'use strict';
function qualifyUrl(url) {
	const a = document.createElement('a');
	a.href = url;
	return a.href;
}
module.exports = qualifyUrl;