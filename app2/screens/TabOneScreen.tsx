import * as React from 'react';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import partial from 'ramda/es/partial';

import { Text, View } from '../components/Themed';
import { RootTabScreenProps } from '../types';
import UiModePicker from '../components/UiModePicker';
import { Button } from 'react-native';
import eventBus from '../lib/eventBusClient';
import { useEffect } from 'react';
import { SocketEvent, SocketMessage } from 'event-bus/types';

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

function sendFaceDetectResult(result: boolean) {
	eventBus.sendMessage('faceDetect.result', result);
}

function TabOneScreen({ navigation, connectionStatus }: TabOneProps) {
    const [debugState, setDebug] = React.useState(false);
    const [brightness, setBrightness] = React.useState<number>();
    useEffect(() => {
        const subscription = eventBus.subscribe('faceDetect.brightness')
            .subscribe((msg: SocketMessage<number>) => { setBrightness(msg.data.contents); });
        return subscription.unsubscribe.bind(subscription);
    }, []);
    const toggleDebug = () => {
        sendDebugRequest(!debugState);
        setDebug(!debugState);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{connectionStatus}</Text>
            {!!brightness && (<Text>{brightness}</Text>)}

            <View style={styles.separator} />

            <Button
                title="Restart"
                onPress={sendRestartRequest}
            />

            <View style={styles.separator} />

            <UiModePicker />

            <View style={styles.separator} />

            <Button
                title={(debugState) ? 'Hide Debug' : 'Show Debug'}
                onPress={toggleDebug}
            />

            <Button
                onPress={partial(sendFaceDetectResult, [true]) as () => void}
                title="Send Yes Face"
            />

            <Button
                onPress={partial(sendFaceDetectResult, [false]) as () => void}
                title="Send No Face"
            />
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
