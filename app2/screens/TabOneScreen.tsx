import * as React from 'react';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';

import { Text, View } from '../components/Themed';
import { RootTabScreenProps } from '../types';
import UiModePicker from '../components/UiModePicker';
import { TouchableOpacity } from 'react-native-gesture-handler';
import eventBus from '../lib/eventBusClient';

function mapStateToProps (state: any) {
    return {
        connectionStatus: state.connection.status,
    };
}

type TabOneProps = RootTabScreenProps<'Actions'> & {
    connectionStatus: string,
};

function sendRestartRequest () {
	eventBus.request('magicMirror', 'magicMirror.restart');
}

function sendDebugRequest (isDebug: boolean) {
	eventBus.request('faceDetect', 'faceDetect.showDebug', isDebug);
}

function TabOneScreen({ navigation, connectionStatus }: TabOneProps) {
    const [debugState, setDebug] = React.useState(false);
    const toggleDebug = () => {
        sendDebugRequest(!debugState);
        setDebug(!debugState);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{connectionStatus}</Text>

            <View style={styles.separator} />

            <TouchableOpacity
                style={styles.button}
                onPress={sendRestartRequest}
            >
                <Text>Restart</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            <UiModePicker />

            <View style={styles.separator} />

            <TouchableOpacity
                style={styles.button}
                onPress={toggleDebug}
            >
                <Text>{(debugState) ? 'Hide Debug' : 'Show Debug'}</Text>
            </TouchableOpacity>
        </View>
    );
}

export default connect(mapStateToProps)(TabOneScreen);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    button: {
        alignItems: 'center',
        backgroundColor: '#DDDDDD',
        padding: 10
    },
    separator: {
        marginVertical: 30,
        height: 1,
        width: '80%',
    },
});
