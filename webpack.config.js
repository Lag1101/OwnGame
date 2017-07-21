const path = require('path');

module.exports = {
    entry: {
        index: "./site_sources/index.js",
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
    }
};