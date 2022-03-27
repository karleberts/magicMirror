import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import useCachedResources from './hooks/useCachedResources';
import useColorScheme from './hooks/useColorScheme';
import Navigation from './navigation';
import store from './redux/store';
import { monitorConnection } from './redux/reducers/connection';

monitorConnection(store.dispatch, store.getState);

export default function App() {
  const isLoadingComplete = useCachedResources();
  const colorScheme = 'light';

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
        <Provider store={store}>
            <SafeAreaProvider>
                <Navigation colorScheme={colorScheme} />
                <StatusBar />
            </SafeAreaProvider>
        </Provider>
    );
  }
}