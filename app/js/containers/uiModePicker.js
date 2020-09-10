import { connect } from 'react-redux';

import { setMode, } from '../redux/reducers/uiModes';

function mapStateToProps (state) {
	return {
		connectionStatus: state.connection.status,
	};
}

export default connect(mapStateToProps);