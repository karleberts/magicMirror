import Client, { Config } from './client';
import RxWebsocketSubject from './websocketSubject';
import { Observable, Subject, of, noop} from 'rxjs';

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

test('Sends auth packet on connect', () => {
	const client = new Client('test', mockConfig);

	expect(mockedNext).toHaveBeenLastCalledWith(
		expect.objectContaining({
			data: {
				contents: mockConfig.eventBus.secret,
				topic: 'auth',
			},
		})
	);
});

test('Pings server for keepalive', () => {
	jest.useFakeTimers();
	const client = new Client('test', mockConfig);

	jest.advanceTimersByTime(50000);

	expect(mockedNext).toHaveBeenLastCalledWith(
		expect.objectContaining({
			method: 'ping',
		})
	);
});

test('Sends subscription message', () => {
	const client = new Client('test', mockConfig);

	client.subscribe('test');

	expect(mockedNext).toHaveBeenLastCalledWith(
		expect.objectContaining({
			method: 'subscribe',
		})
	);

});

test('Subscription sends message, returns observable', () => {
	const client = new Client('test', mockConfig);

	const message$ = client.subscribe('test');

	expect(mockedNext).toHaveBeenLastCalledWith(
		expect.objectContaining({
			method: 'subscribe',
		})
	);
	expect(message$).toBeInstanceOf(Observable);
});

test('Unsubscribe sends message', () => {
	const client = new Client('test', mockConfig);

	const message$ = client.unsubscribe('test');

	expect(mockedNext).toHaveBeenLastCalledWith(
		expect.objectContaining({
			method: 'unsubscribe',
		})
	);
});

test('Subscription sends message, returns observable', () => {
	const client = new Client('test', mockConfig);

	const response$ = client.request('foo', 'test');

	expect(mockedNext).toHaveBeenLastCalledWith(
		expect.objectContaining({
			method: 'request',
		})
	);
	expect(response$).toBeInstanceOf(Observable);
});

test('Request response observable expires after 10s', () => {
	jest.useFakeTimers();
	const client = new Client('test', mockConfig);
	const response$ = client.request('foo', 'test');
	const completedObserver = jest.fn();
	response$.subscribe(null, completedObserver);

	jest.advanceTimersByTime(10000);

	expect(completedObserver).toHaveBeenCalled();
});

test('Sends messages on socket', () => {
	const client = new Client('test', mockConfig);

	client.sendMessage('foo', 'foo');

	expect(mockedNext).toHaveBeenCalledWith(
		expect.objectContaining({
			method: 'message',
		})
	);
});