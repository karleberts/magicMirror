'use strict';
const React = require('react');
const { Provider } = require('react-redux');
const ReactCSSTransitionGroup = require('react-addons-css-transition-group');

const eventBus = require('../../../../lib/eventBus/client');
const weatherContainer = require('../containers/weather');
const Weather = weatherContainer(require('../components/weather.jsx'));
const calendarContainer = require('../containers/calendar');
const Calendar = calendarContainer(require('../components/calendar.jsx'));

class Mirror extends React.Component {
	constructor (props) {
		super(props);
		this._modeReq$ = eventBus.requests
			.filter(req => req.topic === 'ui.setMode');
		this._faceDetect$ = eventBus.subscribe('faceDetect.result');
		this.state = {
			visible: false,
			mode: 'auto',
		};
	}

	handleModeReq (mode) {
		if (this.state.mode === mode) { return; }
		const newState = {mode};
		if (mode === 'visible') {
			newState.visible = true;
		} else if (mode === 'hidden') {
			newState.visible = false;
		}
		this.setState(newState);
	}

	handleFaceDetectMessage (msg) {
		const visible = msg.data.contents;
		if (this.state.visible !== visible) {
			this.setState({visible});
		}
	}

	componentWillMount () {
		this._modeReq$.subscribe(req => this.handleModeReq(req.params));
		this._faceDetect$.filter(() => this.state.mode === 'auto')
			.subscribe((msg) => this.handleFaceDetectMessage(msg));
	}

	componentWillUnmount () {
		this._faceDetect$.unsubscribe();
		this._modeReq$.unsubscribe();
	}

	render () {
		return (
			<Provider store={this.props.store}>
				<ReactCSSTransitionGroup
					transitionName="ui"
					transitionEnterTimeout={250}
					transitionLeaveTimeout={1000}
				>
					{this.state.visible &&
						<div key="main">
							<Weather visible={this.state.visible} />
							<Calendar visible={this.state.visible} />
						</div>
					}
				</ReactCSSTransitionGroup>
			</Provider>
		);
	}
}
Mirror.propTypes = {
	store: React.PropTypes.object,
	visible: React.PropTypes.bool,
};
module.exports = Mirror;
