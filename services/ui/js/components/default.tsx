import * as React from 'react';
import { Provider } from 'react-redux';

import weatherContainer from '../containers/weather';
import calendarContainer from '../containers/calendar';
import Weather from '../components/weather';
import Calendar from '../components/calendar';
const ConnectedWeather = weatherContainer(Weather);
const ConnectedCalendar = calendarContainer(Calendar);

export default class DefaultView extends React.Component<{
    store: any,
}> {
	render () {
		return (
			<Provider store={this.props.store}>
				<div key="main">
					<ConnectedWeather />
					<ConnectedCalendar />
				</div>
			</Provider>
		);
	}
}
