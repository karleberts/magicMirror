import * as R from 'ramda';
import * as React from 'react';
import cx from 'classnames';

import UpcomingItem from './weather/upcomingItem';

//TODO- create an 'error' service that sends me emails/texts (debounced 1/hr) on any kind of error -
//should listen to 'error' events on the bus...
//TODO- any api or other errors should raise errors on the bus


interface IUpcomingWeather {
    icon: string,
    date: string,
    temp: string,
}
interface IWeather {
    upcoming: Array<IUpcomingWeather>,
    sunrise: any,
    sunset: any,
    moonPhaseClassName: string,
    currentTemp: string,
    maxTemp: number,
    minTemp: number
    icon: string,
}
export default class Weather extends React.Component<{
    fetchWeather(): any,
    abortMonitor(): any,
    weather: IWeather
}> {
	componentWillMount () {
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
