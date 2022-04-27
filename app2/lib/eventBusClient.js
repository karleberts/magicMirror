import Client from 'event-bus/client';
import config from '../config';

config.uiHostname = config.cloudflare.domain;
config.eventBus.useSsl = true;

let client;
export default client || (client = new Client('app', config));