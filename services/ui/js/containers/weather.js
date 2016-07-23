'use strict';
const { connect } = require('react-redux');

const { actions: { monitorWeather, abortMonitor } } = require('../redux/modules/weather');

function mapStateToProps (state) {
	return {
		weather: state.weather,
	};
}

function mapDispatchToProps (dispatch) {
	return {
		monitorWeather: () => dispatch(monitorWeather()),
		abortMonitor: () => dispatch(abortMonitor()),
	};
}

module.exports = connect(mapStateToProps, mapDispatchToProps);
