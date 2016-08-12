var webpack = require("webpack");

module.exports = {
	entry: "./src/main.ts",
	output: {
		filename: "./main.js",
		pathinfo: false,
		libraryTarget: "commonjs2",
	},

	target: "node",

	node: {
		console: true,
		global: true,
		process: false,
		Buffer: false,
		__filename: false,
		__dirname: false,
	},

	resolve: {
		// Add '.ts' and '.tsx' as resolvable extensions.
		extensions: ['', '.js', '.ts', '.d.ts', '.tsx']
	},

	module: {
		loaders: [
			// All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
			{ test: /\.tsx?$/, loader: "ts-loader" }
		],
	},
	ts : {
		compilerOptions: {
			outDir: "./dist"
		}
	},
	/** Doesn't work with ES6 yet. see: https://github.com/mishoo/UglifyJS2/issues/448
	plugins: [
		new webpack.optimize.UglifyJsPlugin()
	]
	**/
};