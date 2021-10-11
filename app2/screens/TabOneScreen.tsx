import * as React from 'react';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';

import EditScreenInfo from '../components/EditScreenInfo';
import { Text, View } from '../components/Themed';
import { RootTabScreenProps } from '../types';
import UiModePicker from '../components/UiModePicker';

function mapStateToProps (state: any) {
    return {
        connectionStatus: state.connection.status,
    };
}

type TabOneProps = RootTabScreenProps<'Actions'> & {
    connectionStatus: string,
};

function TabOneScreen({ navigation, connectionStatus }: TabOneProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{connectionStatus}</Text>
      <UiModePicker />
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="/screens/TabOneScreen.tsx" />
    </View>
  );
}

export default connect(mapStateToProps)(TabOneScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
