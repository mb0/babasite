const path = require("path")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")

module.exports = {
	entry: {
		main: './src/main.ts',
	},
	output: {
		path: path.join(__dirname, 'dist'),
		filename: '[name].bundle.js',
	},
	plugins: [new MiniCssExtractPlugin()],
	module: {
		rules: [{
			test: /\.ts$/,
			exclude: /node_modules/,
			loader: 'babel-loader',
		}, {
			test: /\.css$/,
			exclude: /node_modules/,
			use: [MiniCssExtractPlugin.loader, 'css-loader'],
		}],
	},
	resolve: {
		extensions: ['.ts', '.js'],
		modules: [
			'src',
			'node_modules',
		]
	},
	devtool: "cheap-module-source-map",
	stats: {assets:true, modules:false, children:false},
	optimization: {
		usedExports: true,
		minimizer: [new CssMinimizerPlugin()],
	},
}
