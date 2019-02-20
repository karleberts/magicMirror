const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require('path');

module.exports = {
	context: path.join(__dirname, './services/ui/js'),
	entry: './index.tsx',
	output: {
		filename: 'bundle.js',
		chunkFilename: '[id].[chunkhash].chunk.js',
		path: path.join(__dirname, './services/ui/public/'),
	},
	resolve: {
		extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
	},
	module: {
		rules: [
			{test: /\.jsx?$/, loader: 'babel-loader'},
			{test: /\.tsx?$/, loader: 'babel-loader'},
			{test: /\.hbs$/, loader: 'handlebars-loader'},
			{
				test: /\.(eot|svg|ttf|woff|woff2)$/,
				loader: 'file-loader?name=fonts/[name].[ext]'
			},
			{
				test: /(\.scss|\.css)$/,
				exclude: /(node_modules|\/scss\/fonts\/)/, //non-vendor, css is 'local' (https://github.com/webpack/css-loader)
				use: [
					MiniCssExtractPlugin.loader,
					'css-loader?sourceMap&importLoaders=1',
					'resolve-url-loader?sourceMap',
					'sass-loader?sourceMap'
				]
			},
		],
	},
	devtool: 'source-map',
	node: {
		fs: 'empty',
		net: 'empty',
		tls: 'empty'
	},
	plugins: [
		// new ExtractTextPlugin({filename: 'extractedFromBundle.css', allChunks: true}),
		new MiniCssExtractPlugin({
		  filename: "extractedFromBundle.css",
		  chunkFilename: "[id].css"
		}),
		new webpack.IgnorePlugin(/^uws$/)
	]
};
