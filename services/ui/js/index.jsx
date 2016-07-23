"use strict";
import Rx from 'rxjs/Rx'; //import all Observable functions
const React = require('react');
const { Provider } = require('react-redux');
const { render } = require('react-dom');

const configureStore = require('./redux/configureStore');
const weatherContainer = require('./containers/weather');
const Weather = weatherContainer(require('./components/weather.jsx'));
const calendarContainer = require('./containers/calendar');
const Calendar = calendarContainer(require('./components/calendar.jsx'));
//TODO- global ref
const eventBus = window.eb = require('../../eventBus/client');

const store = configureStore();
if (window.devToolsExtension) {
	window.devToolsExtension.updateStore(store);
}

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
			visible: true
		};
	}
	render () {
		return (
			<Provider store={store}>
				<div>
					<Weather visible={this.state.visible} />
					<Calendar visible={this.state.visible} />
				</div>
			</Provider>
		);
	}
}

var container = document.getElementById('content');
render(<Mirror />, container);
