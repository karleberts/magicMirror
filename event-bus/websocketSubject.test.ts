import WebSocketSubject from './websocketSubject';
import Socket from 'ws';

jest.mock('ws');

const MockedWebSocket = <jest.MockedClass<typeof Socket>>Socket;

beforeEach(function () {
	MockedWebSocket.mockClear();
});

test('Can be constructed', function () {
	const wss$ = new WebSocketSubject(
		'localhost',
		1000,
		0
	);

	expect(wss$).toBeInstanceOf(WebSocketSubject);
});

test('Emits connected event', function () {
	const wss$ = new WebSocketSubject(
		'localhost',
		1000,
		0,
		MockedWebSocket
	);
	const onConnectionEvent = jest.fn();
	wss$.connectionStatus.subscribe(onConnectionEvent);
	wss$.connect();
	const mockedSocketInstance = MockedWebSocket.mock.instances[0];

	mockedSocketInstance.onopen({
		target: mockedSocketInstance,
	});

	expect(onConnectionEvent).toHaveBeenCalledWith(true);
});

test('Attempts to reconnect on disconnect', function () {
	jest.useFakeTimers();
	const wss$ = new WebSocketSubject(
		'localhost',
		1000,
		0,
		MockedWebSocket
	);
	wss$.connect();
	const mockedSocketInstance = MockedWebSocket.mock.instances[0];

	mockedSocketInstance.onclose({
		wasClean: false,
		code: 0,
		reason: 'foo',
		target: null,
	});
	jest.runAllTimers();

	expect(MockedWebSocket).toHaveBeenCalledTimes(2);
});

test('Emits on socket event', function () {
	const wss$ = new WebSocketSubject(
		'localhost',
		1000,
		0,
		MockedWebSocket
	);
	wss$.connect();
	const mockedSocketInstance = MockedWebSocket.mock.instances[0];
	const onMessage = jest.fn();
	wss$.subscribe(onMessage);

	mockedSocketInstance.onmessage({
		data: JSON.stringify({foo: 'foo'}),
		type: 'foo',
		target: mockedSocketInstance,
	});

	expect(onMessage).toHaveBeenCalled();
});

test('Sends serialized messages to socket', function () {
	const wss$ = new WebSocketSubject(
		'localhost',
		1000,
		0,
		MockedWebSocket
	);
	wss$.connect();
	const mockedSocketInstance = MockedWebSocket.mock.instances[0];
	mockedSocketInstance.onopen({
		target: mockedSocketInstance,
	});
	mockedSocketInstance.readyState = WebSocket.OPEN;
	const data = {foo: 'foo'};

	wss$.send({foo: 'foo'});

	expect(mockedSocketInstance.send).toHaveBeenCalledWith(wss$.serializer(data));
});

test('Emits closed event', function () {
	const wss$ = new WebSocketSubject(
		'localhost',
		1000,
		0,
		MockedWebSocket
	);
	const onClosedEvent = jest.fn();
	wss$.connectionStatus.subscribe(onClosedEvent);
	wss$.connect();
	const mockedSocketInstance = MockedWebSocket.mock.instances[0];

	mockedSocketInstance.onclose({
		wasClean: true,
		code: 0,
		reason: 'foo',
		target: mockedSocketInstance,
	});

	expect(onClosedEvent).toHaveBeenCalledWith(false);
});