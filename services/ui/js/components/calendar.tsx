import * as React from 'react';
import * as moment from 'moment';

interface ICalendarEvent {
    id: string,
    date: string,
    summary: string,
    time: string
}
interface IDateTime {
    date: string,
    time: string,
}

interface ICalendarProps {
    fetchEvents(): void,
    events: Array<ICalendarEvent>
}
interface ICalendarState {
    dateTime: IDateTime
}
export default class Calendar extends React.Component<ICalendarProps, ICalendarState> {
    updateInterval?: number;
	constructor (props: ICalendarProps) {
		super(props);

		const m = moment();
		this.state = {
			dateTime: {
				date: m.format('dddd MMMM Do'),
				time: m.format('h:mm'),
			},
		};
	}

	componentWillMount () {
		this.props.fetchEvents();
	}

	componentDidMount () {
		this.updateInterval = window.setInterval(() => {
			const m = moment();
			this.setState({
				dateTime: {
					date: m.format('dddd MMMM Do'),
					time: m.format('h:mm'),
				}
			});
		}, 30000);

	}

	componentWillUnmount () {
		window.clearInterval(this.updateInterval);
	}

	render () {
		const events = this.props.events.map(event => (
			<li key={event.id}>
				<span className="eventDate">{event.date}</span>
				<span className="eventSummary">{event.summary}</span>
				<span className="eventTime">({event.time})</span>
				<div className="clear"></div>
			</li>
		));

		return (
			<div id="calendarContainer">
				<div className="date">{this.state.dateTime.date}</div>
				<div className="time">{this.state.dateTime.time}</div>
				<ul className="events">
					{events}
				</ul>
			</div>
		);
	}
}
