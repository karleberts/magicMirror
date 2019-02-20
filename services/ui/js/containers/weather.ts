import { Action, Dispatch } from 'redux';
import { connect } from 'react-redux';

import { actions as weatherActions } from '../redux/modules/weather';
const { fetchWeather, monitorWeather, abortMonitor } = weatherActions;

function mapStateToProps (state: any) {
	return {
		weather: state.weather,
	};
}

function mapDispatchToProps (dispatch: Dispatch<Action>) {
	return {
		fetchWeather: () => dispatch(fetchWeather()),
		monitorWeather: () => dispatch(monitorWeather()),
		abortMonitor: () => dispatch(abortMonitor()),
	};
}

export default connect(mapStateToProps, mapDispatchToProps);
