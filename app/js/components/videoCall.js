import React from 'react';
import { StyleSheet, View, Text, } from 'react-native';
import partial from 'lodash/partial';
import {
	getUserMedia,
	MediaStreamTrack,
	RTCView,
} from 'react-native-webrtc';
import * as WebRTC from 'react-native-webrtc';
import Peer from 'simple-peer';

import * as eventBus from 'event-bus/client';

const configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
// const pc = new RTCPeerConnection(configuration);
let isFront = true;
const peerConnectionConstraints = {
	mandatory: {},
};

function sendWebRTCSignal (msg) {
	eventBus.sendMessage('webrtc.signal', msg, 'magicMirror.ui')
}

const localDescriptionConstraints = {
	optional: [],
	mandatory: {
		offerToReceiveVideo: true,
		offerToReceiveAudio: true,
	},
};

function getMediaStream () {
	return new Promise((resolve, reject) => {
		MediaStreamTrack.getSources(sourceInfos => {
			console.log(sourceInfos);
			let videoSourceId;
			for (let i = 0; i < sourceInfos.length; i++) {
				const sourceInfo = sourceInfos[i];
				if (sourceInfo.kind === "video" &&
						sourceInfo.facing === (isFront ? "front" : "back")) {
					videoSourceId = sourceInfo.id;
				}
			}
			getUserMedia({
				audio: true,
				video: {
					mandatory: {
						minWidth: 500, // Provide your own width, height and frame rate here
						minHeight: 300,
						minFrameRate: 30
					},
					facingMode: (isFront ? "user" : "environment"),
					optional: (videoSourceId ? [{sourceId: videoSourceId}] : [])
				}
			}, resolve, reject);
		});
	});
}

function startCall (mediaStream) {
	const peer = new Peer({
		config: configuration,
		constraints: peerConnectionConstraints,
		initiator: true,
		offerConstraints: localDescriptionConstraints,
		stream: mediaStream,
		wrtc: WebRTC,
	});
	peer.on('signal', sendWebRTCSignal);
	eventBus.subscribe('webrtc.signal')
		.subscribe(peer.signal);

}

export default class VideoCall extends React.Component {
	constructor (props) {
		super(props);
		this.props.navigator.setOnNavigatorEvent(this.handleNavigatorEvent.bind(this));
		this.addRemoteMediaStream = this.addRemoteMediaStream.bind(this);
		this.state = {
			isInCall: false,
			localMediaStream: null,
			localMediaStreamURL: null,
			remoteMediaStream: null,
			remoteMediaStreamURL: null,
		};
	}

	addRemoteMediaStream (remoteStream) {
		this.setState({
			remoteStream,
			remoteMediaStreamURL: remoteStream.toURL(),
		});
	}

	hangup () {
		this.setState({isInCall: false});
		if (this.state.localMediaStream) {
			this.state.localMediaStream
				.getTracks()
				.forEach(track => track.stop());
		}
	}

	call () {
		this.setState({isInCall: true});
		const peer = startCall(this.state.localMediaStream);
		peer.on('stream', this.addRemoteMediaStream);
	}

	handleNavigatorEvent (evt) {
		switch (evt.id) {
		case 'willAppear':
			return this.startPreview();
		case 'didDisappear':
			this.hangup();
		}
	}

	startPreview () {
		getMediaStream()
			.then(stream => {
				this.setState(() => ({
					localMediaStream: stream,
					localMediaStreamURL: stream.toURL()
				}));
			});
	}

	render () {
		return (
			<View style={styles.container}>
				<Text>video call</Text>
				<RTCView
					streamURL={(this.state.isInCall) ? this.state.remoteMediaStreamURL : this.state.localMediaStreamURL}
					style={styles.largeVideo}
				/>
				{this.state.isInCall && (
					<RTCView
						streamURL={this.state.localMediaStreamURL}
						style={styles.previewVideo}
					/>
				)}
			</View>
		);
	}
}
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		height: '100%',
		justifyContent: 'center',
	},
	largeVideo: {
		height: '100%',
		width: '100%',
	},
	previewVideo: {
		height: '20%',
		width: 'auto',
		position: 'absolute',
		top: '5%',
		right: '-5%',
	},
});