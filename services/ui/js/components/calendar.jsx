"use strict";
const moment = require('moment');
const React = require('react');
//const React = require('react/addons');
//const ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

class Calendar extends React.Component {
	constructor (props) {
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
Calendar.propTypes = {
	events: React.PropTypes.array,
	fetchEvents: React.PropTypes.func.isRequired,
};

module.exports = Calendar;
