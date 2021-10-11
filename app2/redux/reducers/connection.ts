import { createAction, handleActions } from 'redux-actions';
import { startWith } from 'rxjs/operators';

import eventBus from '../../lib/eventBusClient';
import type { AppDispatch } from '../store';

export const STATUSES = {
	connected: 'connected',
	connecting: 'connecting',
	disconnected: 'disconnected',
};

const actions = {
	setStatus: createAction('connection/SET_STATUS'),
};

export function monitorConnection (dispatch: AppDispatch, getState: any) {
    eventBus.connectionStatus
        .pipe(startWith(false))
		.subscribe(isConnected => {
            const nextState = (isConnected) ?
				STATUSES.connected :
				STATUSES.connecting;
			dispatch(actions.setStatus(nextState));
		});
}

export default handleActions<any>({
	[actions.setStatus]: (state, action) => ({
        ...state,
        status: action.payload}),
}, {
	status: STATUSES.disconnected,
});
