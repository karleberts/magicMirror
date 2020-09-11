import Client, { Config } from './client';
import RxWebsocketSubject from './websocketSubject';
import { Subject, of, noop} from 'rxjs';

jest.mock('./websocketSubject');
const MockedRxWebSocket = <jest.MockedClass<typeof RxWebsocketSubject>>RxWebsocketSubject;

const mockedNext = jest.fn();
beforeEach(function () {
	MockedRxWebSocket.mockClear();
	mockedNext.mockClear();
	MockedRxWebSocket.mockImplementation(() => {
		const mockSocket = new Subject() as any;
		mockSocket.connectionStatus = of(true);
		mockSocket.connect = noop;
		mockSocket.next = mockedNext;

		return mockSocket;
	})
});

const mockConfig: Config = {
    uiHostname: 'foo',
    eventBus: {
		secret: 'foo',
		useSsl: true
    },
    ports: {
        eventBus: 80,
        eventBusSsl: 8080,
    }
};

test('Can be constructed', () => {
	const client = new Client('test', mockConfig);

	expect(client).toBeTruthy();
});

test('Pings server for keepalive', () => {
	jest.useFakeTimers();
	const client = new Client('test', mockConfig);

	jest.advanceTimersByTime(50000);

	console.log(mockedNext);
	expect(mockedNext).toHaveBeenLastCalledWith(
		expect.objectContaining({
			method: 'ping',
		})
	);
});