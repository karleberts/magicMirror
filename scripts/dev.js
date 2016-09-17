"use strict";
const getWebpackConfig = require('../webpack.config.js');

const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const async = require('async');

const DEVPORT = require('./lib/vars').devPort;

function startDevServer (config, callback) {
	console.log('starting dev server');

	// const publicPath = common.ui.cdnHost + "/" + config.output.publicPath;
	const publicPath = `magicMirror:8090/${config.output.publicPath}`;
	console.log("publicPath: " + publicPath);

	var server = new WebpackDevServer(webpack(config), {
		publicPath,
		hot: true,
		historyApiFallback: true,
		noInfo: true,
		headers: {
			'Access-Control-Allow-Origin' : '*'
		},
	});

	server.listen(DEVPORT, 'localhost', err => {
		if (err) { return console.error('error starting dev server', err); }
		console.log(`Webpack dev server listening at ${DEVPORT}.`);
		callback();
	});
}

function addDevParamsToConfig (mergedConfig, callback) {
	mergedConfig.devtool = 'inline-source-map';

	mergedConfig.entry = Object.keys(mergedConfig.entry)
		.reduce((collection, key) => Object.assign({
			[key]: [
				`webpack-dev-server/client?http://0.0.0.0:3000`,
				'webpack/hot/only-dev-server'
			].concat(mergedConfig.entry[key])
		}, collection), {});

//	mergedConfig.output.publicPath = `http://localhost:3000${mergedConfig.output.publicPath}`;

	mergedConfig.plugins = (mergedConfig.plugins || []).concat([
		new webpack.DefinePlugin({'process.env': {NODE_ENV: JSON.stringify('development')}}),
		new webpack.HotModuleReplacementPlugin()
	]);

	mergedConfig.module.loaders = [{
		test: /\.jsx?$/,
		exclude: /node_modules/,
		loader: 'react-hot'
	}].concat(mergedConfig.module.loaders);

	mergedConfig.watch = true;

	callback(null, mergedConfig);
}

async.waterfall([
	cb => getWebpackConfig(1, cb),
	(configs, cb) => addDevParamsToConfig(configs[0], cb),
	(config, cb) => startDevServer(config, cb)
], (err, result) => {
	if (err) { return console.error(err); }
});
