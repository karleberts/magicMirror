import createServer from './server';
import config from '../config.json';
import { Server } from 'ws';
createServer(Server, config);
