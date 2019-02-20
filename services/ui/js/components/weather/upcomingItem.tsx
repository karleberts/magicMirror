import * as React from 'react';
import cx from 'classnames';

interface UpcomingItemProps {
    icon: string,
    date: string,
    temp: string,
}
export default function UpcomingItem (props: UpcomingItemProps) {
	return (
		<div>
			<i className={cx('wi', props.icon)} />
			<span className="date">{props.date}</span>
			<span className="temp">{props.temp}
				<i className="wi wi-degrees" />
			</span>
		</div>
	);
};
