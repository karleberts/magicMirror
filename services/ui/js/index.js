"use strict";

var $ = require('jquery');
var Rx = require('rx');
var React = require('react');
var Promise = require('bluebird');
var Weather = require('./weather');
var Calendar = require('./calendar');
//TODO- global ref
var eventBus = window.eb = require('../../eventBus/client');
eventBus.connect('magicMirror.ui')
	.then(() => {
		var fooStream = eventBus.subscribe('faceDetect.result');
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
	React.render(<Mirror />, container);
});
