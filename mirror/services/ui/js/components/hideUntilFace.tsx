import * as React from 'react';
import * as ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { Subscription } from 'rxjs';

import eventBus from 'event-bus/client';

interface IHideProps {
    Component: React.ReactElement,
}
interface IHideState {
    visible: boolean,
}
export default class HideUntilFaces extends React.Component<IHideProps, IHideState> {
    _faceDetect$?: Subscription;
	constructor (props: IHideProps) {
		super(props);
		this.state = {
			visible: false,
		};
	}

	handleFaceDetectMessage (msg: any) {
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
		this._faceDetect$ && this._faceDetect$.unsubscribe();
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
