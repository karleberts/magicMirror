"use strict";
const R = require('ramda');
const React = require('react');
const cx = require('classnames');

const UpcomingItem = require('./weather/upcomingItem.jsx');

//TODO- create an 'error' service that sends me emails/texts (debounced 1/hr) on any kind of error -
//should listen to 'error' events on the bus...
//TODO- any api or other errors should raise errors on the bus


class Weather extends React.Component {
	componentWillMount () {
		// this.props.monitorWeather();
		this.props.fetchWeather();
	}

	componentWillUnmount () {
		this.props.abortMonitor();
	}

	render () {
		const { weather } = this.props;
		const upcoming = weather.upcoming
			.map((up, i) => <UpcomingItem {...R.merge(up, {key: i})} />);

		return (
			<div id="weatherContainer">
				<div className="sun">
					<i className="wi wi-sunrise" />
					<span>{weather.sunrise.format('h:mma')}</span>
					<i className="wi wi-sunset" />
					<span>{weather.sunset.format('h:mma')}</span>
					<i className={cx('moonPhase', 'wi', weather.moonPhaseClassName)} />
				</div>
				<div className="current">
					<i className={cx('currentIcon', 'wi', weather.icon)} />
					<div className="currentTemp">
						{weather.currentTemp}<i className="wi wi-degrees" />
					</div>
					<div className="hilo">
						<div>{weather.maxTemp}<i className="wi wi-degrees" /></div>
						<div>{weather.minTemp}<i className="wi wi-degrees" /></div>
					</div>
				</div>
				<div className="upcoming">
					{upcoming}
				</div>
			</div>
		);
	}
}
Weather.propTypes = {
	abortMonitor: React.PropTypes.func.isRequired,
	fetchWeather: React.PropTypes.func.isRequired,
	monitorWeather: React.PropTypes.func.isRequired,
	weather: React.PropTypes.object,
};


module.exports = Weather;
