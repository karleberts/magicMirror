'use strict';
const React = require('react');
const cx = require('classnames');

module.exports = function UpcomingItem (props) {
	return (
		<div key={props.key}>
			<i className={cx('wi', props.icon)} />
			<span className="date">{props.date}</span>
			<span className="temp">{props.temp}
				<i className="wi wi-degrees" />
			</span>
		</div>
	);
};