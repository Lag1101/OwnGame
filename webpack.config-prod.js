/**
 * Created by luckybug on 28.10.16.
 */
const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: {
        index: "./site_sources/index.js"
    },
    output: {
        path: path.resolve(__dirname, "./public/js/"),
        filename: "[name].js"
    },
    module: {
        loaders: [
            {
                test: /.jsx?$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                query: {
                    presets: ['es2015', 'react']
                }
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            }
        }),
        new webpack.optimize.UglifyJsPlugin()
    ]
};