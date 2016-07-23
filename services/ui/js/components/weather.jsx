"use strict";
const Promise = require('bluebird');
const React = require('react');
const cx = require('classnames');

const UpcomingItem = require('./weather/upcomingItem.jsx');

//TODO- create an 'error' service that sends me emails/texts (debounced 1/hr) on any kind of error -
//should listen to 'error' events on the bus...
//TODO- any api or other errors should raise errors on the bus


class Weather extends React.Component {
	componentWillMount () {
		this.props.monitorWeather();
	}

	componentWillUnmount () {
		this.props.abortMonitor();
	}

	render () {
		const { weather } = this.props;
		const upcoming = weather.upcoming
			.map((up, i) => <UpcomingItem {...Object.assign({key: i}, up)} />);

		return (
			<div id="weatherContainer">
				<div className="sun">
					<i className="wi wi-sunrise"></i>
					<span>{weather.sunrise.format('h:mma')}</span>
					<i className="wi wi-sunset"></i>
					<span>{weather.sunset.format('h:mma')}</span>
					<i className={cx('moonPhase', 'wi', weather.moonPhaseClassName)}></i>
				</div>
				<div className="current">
					<i className={cx('currentIcon', 'wi', weather.icon)}></i>
					<div className="currentTemp">
						{weather.currentTemp}<i className="wi wi-degrees"></i>
					</div>
					<div className="hilo">
						<div>{weather.maxTemp}<i className="wi wi-degrees"></i></div>
						<div>{weather.minTemp}<i className="wi wi-degrees"></i></div>
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
	monitorWeather: React.PropTypes.func.isRequired,
	weather: React.PropTypes.object,
};


module.exports = Weather;
