import React from 'react';
import PropTypes from 'prop-types';
import { Picker } from 'react-native';

import uiModePickerContainer from '../containers/uiModePicker';
import { STATUSES } from '../redux/reducers/connection';
import * as eventBus from 'event-bus/client';

class UiModePicker extends React.Component {
	constructor (props) {
		super(props);
		this.handleValueChange = this.handleValueChange.bind(this);
		this.state = {
			mode: 'auto',
		};
	}

	handleValueChange (value) {
		eventBus.request('magicMirror', 'mode.set', {mode: value});
	}

	subscribeToModeUpdates () {
		(this.mode$ && this.mode$.unsubscribe());
		this.mode$ = eventBus.request('magicMirror', 'mode.get')
			.merge(eventBus.subscribe('ui.modeChanged')
				.map(msg => msg.data.contents))
			.subscribe(mode => this.setState(() => ({mode})));
	}

	unsubscribeFromModeUpdates () {
		this.mode$ && this.mode$.unsubscribe();
	}

	componentDidMount () {
		if (this.props.connectionStatus === STATUSES.connected) {
			this.subscribeToModeUpdates(this.props);
		}
	}

	componentWillReceiveProps (nextProps) {
		if (this.props.connectionStatus !== STATUSES.connected &&
				nextProps.connectionStatus === STATUSES.connected) {
			this.subscribeToModeUpdates(nextProps);
		}
	}

	componentWillUnmount () {
		this.unsubscribeFromModeUpdates();
	}

	render () {
		return (
			<Picker
				selectedValue={this.state.mode}
				onValueChange={this.handleValueChange}
			>
				<Picker.Item label="Detect Faces" value="auto" />
				<Picker.Item label="Always On" value="visible" />
				<Picker.Item label="Disabled" value="hidden" />
				<Picker.Item label="Haunted Painting" value="painting" />
			</Picker>
		);
	}
}
UiModePicker.propTypes = {
	connectionStatus: PropTypes.string,
};
export default uiModePickerContainer(UiModePicker);