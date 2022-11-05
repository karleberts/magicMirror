import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Picker } from '@react-native-picker/picker';
import type { Subscription } from 'rxjs/Subscription';
import { merge, map } from 'rxjs/operators';

import { STATUSES } from '../redux/reducers/connection';
import eventBus from '../lib/eventBusClient';

type UiModePickerProps = {
    connectionStatus: string,
};

type UiModePickerState = {
    mode: string,
};

function mapStateToProps (state: any) {
	return {
		connectionStatus: state.connection.status,
	};
}

class UiModePicker extends React.Component<UiModePickerProps, UiModePickerState> {
    private mode$: Subscription | null;
	constructor (props: UiModePickerProps) {
		super(props);
		this.handleValueChange = this.handleValueChange.bind(this);
        this.mode$ = null;
		this.state = {
			mode: 'auto',
		};
	}

	handleValueChange (value: string) {
        if (this.state.mode === value) { return; }
        console.log('requesting value to be set to ' + value + ' current state ' + this.state.mode);
		eventBus.request('magicMirror', 'mode.set', {mode: value});
	}

	subscribeToModeUpdates () {
		(this.mode$ && this.mode$.unsubscribe());
        const incomingModeMessage$ = eventBus.subscribe('ui.modeChanged')
            .pipe(map(msg => msg.data.contents));
		this.mode$ = eventBus.request('magicMirror', 'mode.get')
            .pipe(merge(incomingModeMessage$))
			.subscribe(mode => this.setState((state: UiModePickerState) => {
                return ({...state, mode: mode});
            }));
	}

	unsubscribeFromModeUpdates () {
		this.mode$ && this.mode$.unsubscribe();
	}

	componentDidMount () {
		if (this.props.connectionStatus === STATUSES.connected) {
			this.subscribeToModeUpdates();
		}
	}

	componentWillReceiveProps (nextProps: UiModePickerProps) {
		if (this.props.connectionStatus !== STATUSES.connected &&
				nextProps.connectionStatus === STATUSES.connected) {
			this.subscribeToModeUpdates();
		}
	}

	componentWillUnmount () {
		this.unsubscribeFromModeUpdates();
	}

	render () {
        console.log(this.state);
		return (
			<Picker
				selectedValue={this.state.mode}
				onValueChange={val => {
                    this.handleValueChange(val);
                }}
			>
				<Picker.Item label="Detect Faces" value="auto" />
				<Picker.Item label="Always On" value="visible" />
				<Picker.Item label="Disabled" value="hidden" />
				<Picker.Item label="Haunted Painting" value="painting" />
			</Picker>
		);
	}
}
export default connect(mapStateToProps)(UiModePicker);
