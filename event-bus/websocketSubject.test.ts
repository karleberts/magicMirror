import WebSocketSubject from './websocketSubject';
import { webSocket } from 'rxjs/webSocket';

jest.mock('rxjs/webSocket');

test('Can be constructed', function () {
	const wss$ = new WebSocketSubject(
		'localhost',
		1000,
		0
	);
	expect(wss$).toBeInstanceOf(WebSocketSubject);
});