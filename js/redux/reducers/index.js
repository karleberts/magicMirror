import { combineReducers } from 'redux';

import connection from './connection';
import uiModes from './uiModes';

export default combineReducers({
	connection,
	uiModes,
});