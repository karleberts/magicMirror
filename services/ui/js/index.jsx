"use strict";
import Rx from 'rxjs/Rx'; //import all Observable functions
const React = require('react');
const { render } = require('react-dom');

const Mirror = require('./components/mainPage.jsx');
const configureStore = require('./redux/configureStore');
//TODO- global ref
const eventBus = window.eb = require('../../eventBus/client');

const store = configureStore();
if (window.devToolsExtension) {
	window.devToolsExtension.updateStore(store);
}

eventBus.connect('magicMirror.ui')
	.then(() => console.log('connected to evtBus'));

eventBus.requests.subscribe(({topic, params, respond}) => {
	console.log('captured an evtBus req: ', arguments);
	console.log(topic);
});


var container = document.getElementById('content');
render(<Mirror store={store} />, container);
