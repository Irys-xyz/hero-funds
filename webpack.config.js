const path = require('path');
const { DuplicatesPlugin } = require("inspectpack/plugin");
const DtsBundleWebpack = require('dts-bundle-webpack')

const base = {
    entry: './src/library/index.ts',
    // devtool: 'source-map',
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

        fallback: {
            "crypto": require.resolve("crypto-browserify"),
            "path": require.resolve("path-browserify"),
            "constants": require.resolve("constants-browserify"),
            "stream": require.resolve("stream-browserify")
        }
    },
    plugins: [
        new DtsBundleWebpack({
            name: "@bundlr-network/hero-funds",
            main: "./build/library/index.d.ts",
            out: "./bundle.d.ts"
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
        path: path.resolve(__dirname, 'build/library'),
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
        path: path.resolve(__dirname, 'build/library'),
        library: "HeroFunds",
        libraryTarget: "umd",
        globalObject: "globalThis",
        umdNamedDefine: true,
    }
}

module.exports = [mod, umd]