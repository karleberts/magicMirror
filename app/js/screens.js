import { Navigation } from 'react-native-navigation';

import Actions from './components/actions';
import VideoCall from './components/videoCall';
import ConnectionStatusPopup from './components/connectionStatus';

export const screenIds = {
	actions: 'mirrorApp.Actions',
	videoCall: 'mirrorApp.VideoCall',
	connectionStatusPopup: 'mirrorApp.connectionStatusPopup',
};

export function registerScreens (store, Provider) {
	Navigation.registerComponent(screenIds.actions, () => Actions, store, Provider);
	Navigation.registerComponent(screenIds.videoCall, () => VideoCall, store, Provider);
	Navigation.registerComponent(screenIds.connectionStatusPopup, () => ConnectionStatusPopup, store, Provider);
}