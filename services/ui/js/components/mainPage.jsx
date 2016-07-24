'use strict';
const React = require('react');
const { Provider } = require('react-redux');

const eventBus = require('../../../eventBus/client');
const weatherContainer = require('../containers/weather');
const Weather = weatherContainer(require('../components/weather.jsx'));
const calendarContainer = require('../containers/calendar');
const Calendar = calendarContainer(require('../components/calendar.jsx'));

class Mirror extends React.Component {
	constructor (props) {
		super(props);
		this.state = {visible: true};
	}

	onFaceDetectMessage (msg) {
		console.log('faceDetect says', msg);
	}

	componentWillMount () {
		this._faceDetect$ = eventBus.subscribe('faceDetect.result') //unfortunate naming... (.subscribe.subscribe)
			.subscribe(msg => this.onFaceDetectMessage(msg));

	}

	componentWillUnmount () {
		this._faceDetect$.unsubscribe();
	}

	render () {
		return (
			<Provider store={this.props.store}>
				<div>
					<Weather visible={this.state.visible} />
					<Calendar visible={this.state.visible} />
				</div>
			</Provider>
		);
	}
}
Mirror.propTypes = {
	store: React.PropTypes.object,
	visible: React.PropTypes.bool,
};
module.exports = Mirror;
