import { createAction, handleActions } from 'redux-actions';

import * as eventBus from 'event-bus/client';

const actions = {
	set: createAction('uiModes/SET'),
};

export function setMode (mode) {
	return function dispatchSetMode (dispatch) {
		eventBus.request('magicMirror', 'ui.setMode', mode);
	};
}

export default handleActions({
	[actions.set]: (state, action) => ({...state, mode: action.payload}),
}, {
	mode: 'auto',
});