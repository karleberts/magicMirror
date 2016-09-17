'use strict';
const React = require('react');
const { Provider } = require('react-redux');
const ReactCSSTransitionGroup = require('react-addons-css-transition-group');

const eventBus = require('../../../eventBus/client');
const weatherContainer = require('../containers/weather');
const Weather = weatherContainer(require('../components/weather.jsx'));
const calendarContainer = require('../containers/calendar');
const Calendar = calendarContainer(require('../components/calendar.jsx'));

class Mirror extends React.Component {
	constructor (props) {
		super(props);
		this.state = {visible: false};
	}

	onFaceDetectMessage (msg) {
		const visible = msg.data.contents;
		if (this.state.visible !== visible) {
			this.setState({visible});
		}
	}

	componentWillMount () {
		this._faceDetect$ = eventBus.subscribe('faceDetect.result') //unfortunate naming... (.subscribe.subscribe)
			.subscribe(msg => this.onFaceDetectMessage(msg));
	}

	componentWillUnmount () {
		this._faceDetect$.unsubscribe();
	}

	render () {
		return (
			<Provider store={this.props.store}>
				<ReactCSSTransitionGroup
					transitionName="fadeIn"
					transitionEnterTimeout={5000}
					transitionLeaveTimeout={500}
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
