const webpack = require('webpack');

module.exports = {
	module: {
		loaders: [
			{test: /\.jsx?$/, loader: 'babel-loader'},
			{test: /\.json$/, loader: 'json-loader'},
			{test: /\.hbs$/, loader: 'handlebars-loader'},
		]
	},
	devtool: 'inline-source-map',
	node: {
		fs: 'empty',
		net: 'empty',
		tls: 'empty'
	},
	plugins: [
		new webpack.IgnorePlugin(/^uws$/)
	]
};
