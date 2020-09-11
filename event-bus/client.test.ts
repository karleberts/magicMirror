import client, { createInstance } from './client';

test('Exports default instance', function () {
	expect(Reflect.ownKeys(client)).toEqual(Reflect.ownKeys(createInstance({
		uiHostname: 'foo',
		eventBus: {secret: 'foo'},
		ports: {
			eventBus: 22,
			eventBusSsl: 22,
		}
	})));
})