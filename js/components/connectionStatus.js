import React from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, Button, Text, View } from 'react-native';

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
					<Button
						onPress={connect}
						title="Reconnect"
					/>
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
export default ConnectionStatus;