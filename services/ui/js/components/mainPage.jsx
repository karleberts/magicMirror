'use strict';
const React = require('react');
const { Provider } = require('react-redux');

const weatherContainer = require('../containers/weather');
const Weather = weatherContainer(require('../components/weather.jsx'));
const calendarContainer = require('../containers/calendar');
const Calendar = calendarContainer(require('../components/calendar.jsx'));

class Mirror extends React.Component {
	constructor (props) {
		super(props);
		this.state = {
			visible: true
		};
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
