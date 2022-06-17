const path = require('path');
const webpack = require("webpack");
const { DuplicatesPlugin } = require("inspectpack/plugin");
const DtsBundleWebpack = require('dts-bundle-webpack')

const base = {
    entry: './src/library/index.ts',
    devtool: 'source-map',
    mode: "production",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        configFile: path.resolve("./tsconfig.json")
                    }
                }],
                exclude: [
                    /node_modules/,
                    path.resolve(__dirname, "src/contracts/"),
                    path.resolve(__dirname, "src/deployment/"),
                    path.resolve(__dirname, "build/")
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        // alias: {
        //     // process: "process/browser",
        //     // crypto: "crypto-browserify",
        //     // stream: "stream-browserify",
        // },
        fallback: {
            // "crypto": require.resolve("crypto-browserify"),
            // "assert": require.resolve("assert/"),
            // "stream": require.resolve("stream-browserify"),
            // "process": require.resolve("process/browser"),
            // "util": require.resolve("util"),
            // "events": require.resolve("events/"),
            // "buffer": require.resolve('buffer/'),
            // "zlib": require.resolve("browserify-zlib"),
            "crypto": require.resolve("crypto-browserify"),
            "path": require.resolve("path-browserify"),
            "constants": require.resolve("constants-browserify"),
            "stream": require.resolve("stream-browserify")
        }


    },
    plugins: [
        new DtsBundleWebpack({
            name: "@bundlr-network/hero-funds",
            main: "./build/library/index.d.ts"
        }),
        new DuplicatesPlugin({
            emitErrors: false,
            verbose: false
        })
    ],

};
const mod = {
    ...base,
    externals: { ...base.externals },
    externalsType: 'global',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build/esm/'),
        libraryTarget: "module",
        module: true
    },
    experiments: {
        outputModule: true,
    }
}
const umd = {
    ...base,
    output: {
        filename: "umd.bundle.js",
        path: path.resolve(__dirname, 'build/esm/'),
        library: "HeroFunds",
        libraryTarget: "umd",
        globalObject: "globalThis",
        umdNamedDefine: true,
    }
}

module.exports = [mod, umd]