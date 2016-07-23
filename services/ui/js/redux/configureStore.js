/* globals process:false */
"use strict";
const { createStore, applyMiddleware, compose } = require('redux');
const { createEpicMiddleware } = require('redux-observable');

const { rootEpic, rootReducer } = require('./modules/root');
const epicMiddleware = createEpicMiddleware(rootEpic);

module.exports = function configureStore (initialState) {
	let middleware = [epicMiddleware];
	const finalCreateStore = compose(
		applyMiddleware(...middleware),
		window.devToolsExtension ? window.devToolsExtension() : f => f
	)(createStore);
	const store = finalCreateStore(rootReducer, initialState);

	if (module.hot) {
		module.hot.accept('./modules', () => {
			const nextReducer = require('./modules/root');
			store.replaceReducer(nextReducer.rootReducer);
		});
	}

	return store;
};
