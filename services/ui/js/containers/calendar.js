'use strict';
const { connect } = require('react-redux');

const { actions: { fetchEvents } } = require('../redux/modules/calendar');

function mapStateToProps (state) {
	return {
		events: state.calendar.events,
	};
}

function mapDispatchToProps (dispatch) {
	return {
		fetchEvents: () => dispatch(fetchEvents()),
	};
}

module.exports = connect(mapStateToProps, mapDispatchToProps);