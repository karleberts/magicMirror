import * as React from 'react';
import { useEffect } from 'react';
import { useState } from 'react';
import { StyleSheet, Image } from 'react-native';
import { Subscription } from 'rxjs';

import EditScreenInfo from '../components/EditScreenInfo';
import { Text, View } from '../components/Themed';
import eventBus from '../lib/eventBusClient';

export default function TabTwoScreen() {
    const [img, setImg] = useState();
    useEffect(() => {
        const makeRequest = () => eventBus.request('faceDetect', 'faceDetect.getImage');
        const handleResponse = (response: any) => {
            setImg(response);
            subscriber = makeRequest().subscribe(handleResponse);
        };
        let subscriber = makeRequest().subscribe(handleResponse);
        return () => subscriber && subscriber.unsubscribe();
    }, []);
  return (
    <View style={styles.container}>
      {!!img && (
        <Image style={{width: 480, height: 368}} source={{uri: `data:image/png;base64,${img}`}} />
      )}
    </View>
  );
}

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
