import { createAction, handleActions } from 'redux-actions';

import * as eventBus from 'event-bus/client';

export const STATUSES = {
	connected: 'connected',
	connecting: 'connecting',
	disconnected: 'disconnected',
};

const actions = {
	setStatus: createAction('connection/SET_STATUS'),
};

function monitorConnection (sock, dispatch) {
	sock.subscribe(null, null, () => dispatch(actions.setStatus(STATUSES.disconnected)));
	sock.connectionStatus
		.startWith(STATUSES.connected)
		.subscribe(isConnected => {
			dispatch(actions.setStatus((isConnected) ?
				STATUSES.connected :
				STATUSES.connecting));
		});
}

export function connect () {
	return function dispatchConnect (dispatch, getState) {
		const state = getState();
		if (state.connection.status !== STATUSES.disconnected) { return; }
		dispatch(actions.setStatus(STATUSES.connecting));
		eventBus.connect('karl', true)
			.then(sock => {
				monitorConnection(sock, dispatch);
				dispatch(actions.setStatus(STATUSES.connected));
			})
			.catch(err => {
				console.error(err);
				dispatch(actions.setStatus(STATUSES.disconnected));
			});
	};
}

export default handleActions({
	[actions.setStatus]: (state, action) => ({...state, status: action.payload}),
}, {
	status: STATUSES.disconnected,
});
