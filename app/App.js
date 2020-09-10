import { Navigation } from 'react-native-navigation';
import { Provider } from 'react-redux';

import createStore from './js/redux/createStore';
import { connect, STATUSES as CONNECTION_STATUSES } from './js/redux/reducers/connection';
import { registerScreens, screenIds } from './js/screens';

const store = createStore();
registerScreens(store, Provider);
Navigation.startTabBasedApp({
	tabs: [{
		icon: require('./js/images/home.png'),
		label: 'Actions',
		screen: screenIds.actions,
	}, {
		icon: require('./js/images/phone.png'),
		label: 'Video Call',
		screen: screenIds.videoCall,
	}],
});

let connectionStatus;
store.subscribe(() => {
	const state = store.getState();
	if (state.connection.status !== connectionStatus) {
		if (state.connection.status !== CONNECTION_STATUSES.connected) {
			Navigation.showModal({
				screen: screenIds.connectionStatusPopup,
				passProps: {status: state.connection.status},
			});
		} else {
			Navigation.dismissAllModals();
		}
	}
});

store.dispatch(connect());



