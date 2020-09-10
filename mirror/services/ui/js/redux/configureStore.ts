import { createStore, applyMiddleware, compose } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { rootEpic, rootReducer } from './modules/root';

const epicMiddleware = createEpicMiddleware();

export default function configureStore (initialState?: any) {
	let middleware = [epicMiddleware];
	const finalCreateStore: any = compose(
		applyMiddleware(...middleware),
		// window.devToolsExtension ? window.devToolsExtension() : f => f
	)(createStore);
	const store = finalCreateStore(rootReducer, initialState);
	epicMiddleware.run(rootEpic);

	// if (module.hot) {
	// 	module.hot.accept('./modules', () => {
	// 		const nextReducer = require('./modules/root');
	// 		store.replaceReducer(nextReducer.rootReducer);
	// 	});
	// }

	return store;
};
