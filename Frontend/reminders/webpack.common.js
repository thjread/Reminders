const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WorkboxPlugin = require('workbox-webpack-plugin');

module.exports = {
    entry: {
        app: './src/index.ts',
        css: './src/main.css'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            /*{
                test:/\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            }*/
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    "css-loader"
                ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(['dist']),
        new HtmlWebpackPlugin({
            template: './src/index.html'
        }),
        new webpack.HashedModuleIdsPlugin(),
        new CopyWebpackPlugin([
            {from: './src/manifest.json', to: './manifest.json'},
            {from: './src/logo512.png', to: './images/logo512.png'},
            {from: './src/logo192.png', to: './images/logo192.png'},
            {from: './src/favicon.ico', to: './favicon.ico'}
        ]),
        new MiniCssExtractPlugin({
            filename: "[name].[contenthash].css",
            chunkFilename: "[name].[contenthash].css"
        }),
        new WorkboxPlugin.GenerateSW({
            /*clientsClaim: true,
            skipWaiting: true,*/
            runtimeCaching: [
                {
                    urlPattern: new RegExp('https://fonts.googleapis.com/'),
                    handler: 'staleWhileRevalidate'
                },
                {
                    urlPattern: new RegExp('https://fonts.gstatic.com/'),
                    handler: 'cacheFirst'
                }
            ],
            swDest: 'sw.js',
            importWorkboxFrom: 'local'
        })
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: '[name].[contenthash].bundle.js',
        chunkFilename: '[name].[contenthash].chunk.js',
        path: path.resolve(__dirname, 'dist')
    },
    optimization: {
        runtimeChunk: 'single',
        splitChunks: {
            chunks: 'all'
        }
    }
};
