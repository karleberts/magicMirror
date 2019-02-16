'use strict';
const React = require('react');

import * as eventBus from 'event-bus/client';
import DefaultView from './default.jsx';
import HideUntilFace from './hideUntilFace.jsx';
// import Picture from './picture.jsx';
import Painting from './painting.jsx';

export default class Mirror extends React.Component {
	constructor (props) {
		super(props);
		this.state = {
			mode: 'auto',
		};
	}

	handleModeReq (mode) {
		if (this.state.mode === mode) { return; }
		this.setState({mode});
	}

	componentWillMount () {
		this._modeReq$ = eventBus.requests
			.do(msg => console.log('debug', msg))
			.filter(req => req.topic === 'ui.setMode')
			.startWith('auto')
			.subscribe(req => this.handleModeReq(req.params));
		// eventBus.subscribe('webrtc.invite')
		// 	.subscribe(msg => )
	}

	componentWillUnmount () {
		this._modeReq$.unsubscribe();
	}

	render () {
		switch (this.state.mode) {
		case 'visible':
			return <DefaultView {...this.props} />;
		case 'hidden':
			return null;
		// case 'picture':
			// return <Picture />;
		// case 'webrtc':
		// 	return <WebRTC />
		case 'painting':
			return <Painting/>;
		case 'auto':
		default:
			return <HideUntilFace Component={<DefaultView {...this.props} />} />;
		}
	}
}

/*
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
		);
	}
}
*/
Mirror.propTypes = {
	store: React.PropTypes.object,
	visible: React.PropTypes.bool,
};
module.exports = Mirror;
