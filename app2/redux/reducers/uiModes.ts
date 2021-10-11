import { createAction, handleActions } from 'redux-actions';

import eventBus from '../../lib/eventBusClient';
import { AppDispatch } from '../store';

const actions = {
	set: createAction('uiModes/SET'),
};

export function setMode (mode: string) {
	return function dispatchSetMode (dispatch: AppDispatch) {
		eventBus.request('magicMirror', 'ui.setMode', mode);
	};
}

export default handleActions({
	[actions.set]: (state, action) => ({...state, mode: action.payload}),
}, {
	mode: 'auto',
});