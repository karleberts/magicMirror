/**
 * Created by karl on 7/31/15.
 */

module.exports = {
	'module': {
		'loaders': [
			{'test': /\.js$/, 'loader': 'imports?define=>false!babel-loader'},
			{'test': /\.json$/, 'loader': 'json-loader'},
			{'test': /\.hbs$/, 'loader': 'handlebars-loader'},
		]
	},
	'devtool': 'inline-source-map'
};
