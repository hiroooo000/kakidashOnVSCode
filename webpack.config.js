const path = require('path');

const extensionConfig = {
    name: 'extension',
    mode: 'development',
    target: 'node',
    entry: {
        extension: './src/extension.ts'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: 'commonjs',
        clean: true,
        devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    devtool: 'nosources-source-map',
    externals: {
        'vscode': 'commonjs vscode'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /(node_modules|dist)/,
                use: [{ loader: 'ts-loader' }]
            }
        ]
    }
};

const webviewConfig = {
    name: 'webview',
    mode: 'development',
    target: 'web',
    entry: {
        webview: './src/webview/main.ts'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: 'umd',
        globalObject: 'this',
        clean: false, // Don't clean, otherwise extension.js might be deleted
        devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    devtool: 'nosources-source-map',
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /(node_modules|dist)/,
                use: [{ loader: 'ts-loader' }]
            }
        ]
    }
};

module.exports = [extensionConfig, webviewConfig];
