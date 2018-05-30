import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import * as eventBus from 'event-bus/client';

export default class HideUntilFaces extends React.Component {
	constructor (props) {
		super(props);
		this.state = {
			visible: false,
		};
	}

	handleFaceDetectMessage (msg) {
		const visible = msg.data.contents;
		if (this.state.visible !== visible) {
			this.setState({visible});
		}
	}

	componentWillMount () {
		this._faceDetect$ = eventBus.subscribe('faceDetect.result')
			.subscribe(msg => this.handleFaceDetectMessage(msg));
		eventBus.request('faceDetect', 'faceDetect.getStatus')
			.subscribe(visible => this.setState({visible}));
	}

	componentWillUnmount () {
		this._faceDetect$.unsubscribe();
	}

	render () {
		const { Component } = this.props;
		return (
			<ReactCSSTransitionGroup
				transitionName="ui"
				transitionEnterTimeout={250}
				transitionLeaveTimeout={1000}
			>
				{this.state.visible && Component}
			</ReactCSSTransitionGroup>
		);
	}
}
HideUntilFaces.propTypes = {
	Component: React.PropTypes.node,
};