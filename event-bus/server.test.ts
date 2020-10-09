import ws from 'ws';
import http from 'http';
import { EventEmitter } from 'events';
import { Subject, Subscription } from 'rxjs';
import createServer, { Config } from './server';
import { Socket } from 'net';

jest.mock('fs');
jest.mock('https', () => ({
    createServer: jest.fn(() => ({ listen: jest.fn() })),
}));
jest.mock('ws', () => {
    return {
        Server: jest.fn(),
    }
});
jest.useFakeTimers();

let mockServer: EventEmitter|undefined;
let mockSocket: any;
beforeEach(() => {
    mockSocket = new EventEmitter();
    /** @ts-ignore  */
    const ServerMock = ws.Server = jest.fn<EventEmitter, any[]>();
    mockSocket.send = jest.fn();
    mockServer = undefined;
    ServerMock.mockImplementation(() => {
        const ee = new EventEmitter();
        if (!mockServer) { mockServer = ee; }
        return ee;
    });
});


const mockConfig: Config = {
    eventBus: {
        secret: 'foo',
    },
    ports: {
        eventBus: 0,
        eventBusSsl: 0,
    },
};

test('Returns subscription & disconnect$ tuple.', () => {
    const [
        subscription,
        disconnect$,
    ] = createServer(ws.Server, mockConfig);

    expect(subscription).toBeInstanceOf(Subscription);
    expect(disconnect$).toBeInstanceOf(Subject);
});

test('Closes socket on invalid auth', () => {
    createServer(ws.Server, mockConfig);
    const msg = new http.IncomingMessage(new Socket());
    msg.url = 'foo?endpointId=foo';
    mockServer!.emit('connection', [mockSocket, msg]);
    mockSocket.close = jest.fn();

    mockSocket.emit('message', {
        data: JSON.stringify({
            data: {
                topic: 'auth',
                contents: '!' + mockConfig.eventBus.secret,
            }
        }),
    });

    expect(() => jest.runAllTimers()).toThrow();
    expect(mockSocket.close).toHaveBeenCalled();
});

describe('Authed connections', () => {
    let mockSocketB: any;
    beforeEach(() => {
        const [
            subscription,
            disconnect$,
        ] = createServer(ws.Server, mockConfig);
        mockSocketB = new EventEmitter();
        const msg = new http.IncomingMessage(new Socket());
        msg.url = 'foo?endpointId=foo';
        mockServer!.emit('connection', [mockSocket, msg]);
        const msgB = new http.IncomingMessage(new Socket());
        msgB.url = 'foo?endpointId=fooB';
        mockServer!.emit('connection', [mockSocketB, msgB]);

        mockSocket.emit('message', {
            data: JSON.stringify({
                data: {
                    topic: 'auth',
                    contents: mockConfig.eventBus.secret,
                }
            }),
        });
        mockSocketB.emit('message', {
            data: JSON.stringify({
                data: {
                    topic: 'auth',
                    contents: mockConfig.eventBus.secret,
                }
            }),
        });
    });

    test('Receives messages for subscribed topics', () => {
        mockSocket.emit('message', {
            data: JSON.stringify({
                method: 'subscribe',
                data: {                        
                    topic: 'test',
                },
            }),
        });
        const outgoingMsg = {
            method: 'message',
            data: {
                topic: 'test',
                contents: 'some data',
            }
        };
        mockSocketB.emit('message', {
            data: JSON.stringify(outgoingMsg),
        });

        expect(mockSocket.send).toHaveBeenCalledWith(
            expect.stringContaining(outgoingMsg.data.contents)
        );
    });
});