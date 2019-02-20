import * as React from 'react';
import { render } from 'react-dom';
import eventBus from 'event-bus/client';

// import '../scss/main.scss';
import Mirror from './components/mainPage';
import configureStore from './redux/configureStore';


const store = configureStore();

eventBus.connect('magicMirror.ui', true)
	.then(() => {
		eventBus.sendMessage('ui.ready', true, 'magicMirror');
		console.log('connected to evtBus');
	});


const container = document.getElementById('content');
render(<Mirror store={store} />, container);
