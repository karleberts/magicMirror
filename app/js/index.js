import React from 'react';
import { StyleSheet, Text, ScrollView, View } from 'react-native';
import { Provider } from 'react-redux';

import createStore from './redux/createStore';
import * as eventBus from 'event-bus/client';
import UiModePicker from './components/uiModePicker';

const store = createStore();

function test () {
	eventBus.request('magicMirror', 'mode.get')
		.subscribe(response => console.log(response));
}

export default class App extends React.Component {
	constructor (props) {
		super(props);
		this.state = {
			connected: false,
		};
	}

	componentDidMount () {
		console.log('mounted');

		eventBus.connect('karl', true)
			.then(() => this.setState(() => ({
				connected: true,
			})));
	}

	componentWillUnmount () {
		eventBus.disconnect();
	}

	render() {
		return (
			<Provider store={store}>
				<View
					horizontal={true}
					pagingEnabled={true}
					style={styles.container}
				>
					<Text>Open up App.js to start working on your app!</Text>
					<Text>Changes you make will automatically reload.</Text>
					<Text>Shake your phone to open the developer menu.</Text>
					<Text>test.</Text>
					<UiModePicker connected={this.state.connected} />
				</View>
			</Provider>
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
});
