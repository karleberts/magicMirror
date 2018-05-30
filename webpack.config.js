const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');

module.exports = {
	context: path.join(__dirname, './services/ui/js'),
	entry: './index.jsx',
	output: {
		filename: 'bundle.js',
		chunkFilename: '[id].[chunkhash].chunk.js',
		path: path.join(__dirname, './services/ui/public/'),
	},
	module: {
		loaders: [
			{test: /\.jsx?$/, loader: 'babel-loader'},
			{test: /\.json$/, loader: 'json-loader'},
			{test: /\.hbs$/, loader: 'handlebars-loader'},
			{
				test: /\.(eot|svg|ttf|woff|woff2)$/,
				loader: 'file-loader?name=fonts/[name].[ext]'
			},
			{
				test: /(\.scss|\.css)$/,
				exclude: /(node_modules|\/scss\/fonts\/)/, //non-vendor, css is 'local' (https://github.com/webpack/css-loader)
				loader: ExtractTextPlugin.extract({
					fallback: 'style-loader',
					use: [
						'css-loader?sourceMap&importLoaders=1',
						'resolve-url-loader?sourceMap',
						'sass-loader?sourceMap'
					]
				}),
			},
		],
	},
	devtool: 'inline-source-map',
	node: {
		fs: 'empty',
		net: 'empty',
		tls: 'empty'
	},
	plugins: [
		new ExtractTextPlugin({filename: 'extractedFromBundle.css', allChunks: true}),
		new webpack.IgnorePlugin(/^uws$/)
	]
};
