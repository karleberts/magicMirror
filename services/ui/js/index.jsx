"use strict";
import Rx from 'rxjs/Rx'; //import all Observable functions
const React = require('react');
const { render } = require('react-dom');
const eventBus = window.eb = require('event-bus/client');

import '../scss/main.scss';
const Mirror = require('./components/mainPage.jsx');
const configureStore = require('./redux/configureStore');
//TODO- global ref
//const eventBus = window.eb = require('../../../lib/eventBus/client');

const store = configureStore();
if (window.devToolsExtension) {
	window.devToolsExtension.updateStore(store);
}

eventBus.connect('magicMirror.ui', true)
	.then(() => {
		eventBus.sendMessage('ui.ready', true, 'magicMirror');
		console.log('connected to evtBus');
	});


var container = document.getElementById('content');
render(<Mirror store={store} />, container);
