import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';

import * as eventBus from 'event-bus/client';
import UiModePicker from './uiModePicker';

function sendRestartRequest () {
	eventBus.request('magicMirror', 'magicMirror.restart');
}

function toggleDebug (isDebug) {
	eventBus.request('faceDetect', 'faceDetect.showDebug', isDebug);
}

export default class App extends React.Component {
	constructor (props) {
		super(props);
		this.state = {
			isDebug: false,
		};
	}

	toggleDebug () {
		toggleDebug(!this.state.isDebug);
		this.setState(() => ({
			isDebug: !this.state.isDebug,
		}));
	}

	render() {
		return (
			<View
				style={styles.container}
			>
				<TouchableOpacity
					style={styles.button}
					onPress={sendRestartRequest}
				>
					<Text>Restart</Text>
				</TouchableOpacity>

				<UiModePicker />

				<TouchableOpacity
					style={styles.button}
					onPress={this.toggleDebug.bind(this)}
				>
					<Text>{(this.state.isDebug) ? 'Hide Debug' : 'Show Debug'}</Text>
				</TouchableOpacity>
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
	button: {
		alignItems: 'center',
		backgroundColor: '#DDDDDD',
		padding: 10
	},
});
