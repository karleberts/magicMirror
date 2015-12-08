"use strict";

const $ = require('jquery');
const Rx = require('rx');
const React = require('react');
const { render } = require('react-dom');
const Promise = require('bluebird');
const Weather = require('./weather');
const Calendar = require('./calendar');
//TODO- global ref
const eventBus = window.eb = require('../../eventBus/client');
eventBus.connect('magicMirror.ui')
	.then(() => {
		const fooStream = eventBus.subscribe('faceDetect.result');
		fooStream.subscribe(onFoo);
	});
eventBus.requests.subscribe(({topic, params, respond}) => {
	console.log('captured an evtBus req: ', arguments);
	console.log(topic);
});
function onFoo (msg) {
	console.log('received a foo, ', msg);
}

class Mirror extends React.Component {
	constructor (props) {
		super(props);
		this.state = {
			'visible'	: true
		};
	}
	render () {
		return (
			<div>
				<Weather visible={this.state.visible} />
				<Calendar visible={this.state.visible} />
			</div>
		);
	}
}


$(document).ready(() => {
	var container = document.getElementById('content');
	render(<Mirror />, container);
});
