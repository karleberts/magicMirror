import { Action, Dispatch } from 'redux';
import { connect } from 'react-redux';

import { actions as calendarActions } from '../redux/modules/calendar';
const { fetchEvents } = calendarActions;

function mapStateToProps (state: any) {
	return {
		events: state.calendar.events,
	};
}

function mapDispatchToProps (dispatch: Dispatch<Action>) {
	return {
		fetchEvents: () => dispatch(fetchEvents()),
	};
}

export default connect(mapStateToProps, mapDispatchToProps);