module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true,
        "node": true
    },
    "extends": [
		"eslint:recommended", 
		"plugin:lodash/recommended",
		"plugin:react/recommended"
	],
    "parserOptions": {
        "ecmaFeatures": {
            "experimentalObjectRestSpread": true,
            "jsx": true
        },
        "sourceType": "module"
    },
    "plugins": [
        "react",
		"lodash",
    ],
    "rules": {
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": 0,
        "semi": [
            "error",
            "always"
        ],
		"no-console": 0,
		"comma-dangle" : 0,
		"lodash/prefer-lodash-method" : 0,
		"lodash/prefer-lodash-chain" : 0,
		"lodash/prefer-includes" : 0,
		"lodash/matches-shorthand" : 0,
		"lodash/matches-prop-shorthand" : 0,
		"lodash/prefer-matches" : 0,
		"lodash/prefer-reject" : 0,
		"lodash/path-style": [2, "as-needed"],
    }
};
