import * as React from 'react';
import { Observable, Subscription } from 'rxjs';
import {
    filter,
    startWith,
} from 'rxjs/operators';

import Client from 'event-bus/client';
import DefaultView from './default';
import HideUntilFace from './hideUntilFace';
// import Picture from './picture.jsx';
import Painting from './painting';

interface IMirrorProps {
    store: any,
    eventBusClient: Client
}
enum mirrorMode {
    auto = 'auto',
    painting = 'painting',
    visible = 'visible',
    hidden = 'hidden'
}
interface IMirrorState {
    mode: mirrorMode
}
export default class Mirror extends React.Component<IMirrorProps, IMirrorState> {
    _modeReq$?: Subscription;
	constructor (props: IMirrorProps) {
		super(props);
		this.state = {
			mode: mirrorMode.painting,
		};
	}

	handleModeReq (mode: mirrorMode) {
		if (this.state.mode === mode) { return; }
		this.setState({mode});
	}

	componentWillMount () {
		this._modeReq$ = this.props.eventBusClient
            .request$
            .pipe(
                filter(req => req.topic === 'ui.setMode'),
                startWith({params: mirrorMode.painting})
            )
            .subscribe(req => this.handleModeReq(req.params));
		// eventBus.subscribe('webrtc.invite')
		// 	.subscribe(msg => )
	}

	componentWillUnmount () {
		this._modeReq$ && this._modeReq$.unsubscribe();
	}

	render () {
		switch (this.state.mode) {
		case mirrorMode.visible:
			return <DefaultView {...this.props} />;
		case mirrorMode.hidden:
			return null;
		// case 'picture':
			// return <Picture />;
		// case 'webrtc':
		// 	return <WebRTC />
		case mirrorMode.painting:
			return <Painting eventBusClient={this.props.eventBusClient} />;
		case mirrorMode.auto:
		default:
			return (
                <HideUntilFace
                    Component={<DefaultView {...this.props} />}
                    eventBusClient={this.props.eventBusClient}
                />
            );
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
