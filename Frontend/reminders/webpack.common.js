const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    entry: {
        app: "./src/index.ts",
        css: "./src/main.css",
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
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
                    "css-loader",
                ],
            },
        ],
    },
    output: {
        filename: "[name].[contenthash].bundle.js",
        chunkFilename: "[name].[contenthash].chunk.js",
        path: path.resolve(__dirname, "dist"),
    },
    plugins: [
        new CleanWebpackPlugin(["dist"]),
        new CopyWebpackPlugin([
            {from: "./src/manifest.json", to: "./manifest.json"},
            {from: "./src/images/", to: "./images/"},
            {from: "./src/favicon.ico", to: "./favicon.ico"},
            {from: "./src/robots.txt", to: "./robots.txt"},
            {from: "./src/404.html", to: "./404.html"},
            {from: "./src/50x.html", to: "./50x.html"},
        ]),
        new HtmlWebpackPlugin({
            template: "./src/index.html",
        }),
        new webpack.HashedModuleIdsPlugin(),
        new MiniCssExtractPlugin({
            filename: "[name].[contenthash].css",
            chunkFilename: "[name].[contenthash].css",
        }),
    ],
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    optimization: {
        runtimeChunk: "single",
        splitChunks: {
            chunks: "all",
        },
    },
};
