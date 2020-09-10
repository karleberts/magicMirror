import React from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, TouchableOpacity, Text, View, StyleSheet } from 'react-native';

import { STATUSES, connect } from '../redux/reducers/connection';

class ConnectionStatus extends React.Component {
	render () {
		const { status } = this.props;
		return (
			<View>
				<Text>
					{status}
				</Text>
				{status === STATUSES.disconnected && (
					<TouchableOpacity
						onPress={connect}
					>
						<Text>Reconnect</Text>
					</TouchableOpacity>
				)}
				{status === STATUSES.connecting && (
					<ActivityIndicator />
				)}
			</View>
		);
	}
}
ConnectionStatus.propTypes = {
	status: PropTypes.string,
};
const styles = StyleSheet.create({
	button: {
		alignItems: 'center',
		backgroundColor: '#DDDDDD',
		padding: 10
	},
});
export default ConnectionStatus;