import React from 'react';
import { Provider } from 'react-redux';

const weatherContainer = require('../containers/weather');
const calendarContainer = require('../containers/calendar');
const Weather = weatherContainer(require('../components/weather.jsx'));
const Calendar = calendarContainer(require('../components/calendar.jsx'));

export default class DefaultView extends React.Component {
	render () {
		console.log(this.props);
		return (
			<Provider store={this.props.store}>
				<div key="main">
					<Weather visible/>
					<Calendar visible />
				</div>
			</Provider>
		);
	}
}
DefaultView.propTypes = {
	store: React.PropTypes.object,
};
