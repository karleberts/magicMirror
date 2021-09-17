import * as React from 'react';
import { render } from 'react-dom';
import Client from 'event-bus/client';

// import '../scss/main.scss';
import Mirror from './components/mainPage';
import configureStore from './redux/configureStore';
import config from '../../../../config.json';
import { filter, take } from 'rxjs/operators';


const store = configureStore();
const client = new Client('magicMirror.ui', config);
client.connectionStatus
    .pipe(
        filter(isConnected => isConnected),
        take(1),
    )
    .subscribe(() => client.sendMessage('ui.ready', true, 'magicMirror'));

const container = document.getElementById('content');
render(<Mirror store={store} eventBusClient={client} />, container);
