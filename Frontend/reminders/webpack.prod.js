const merge = require("webpack-merge");
const common = require("./webpack.common.js");

const WorkboxPlugin = require("workbox-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

module.exports = merge(common, {
    mode: "production",
    devtool: "source-map",
    plugins: [
        new WorkboxPlugin.InjectManifest({
            swSrc: "./src/sw.js",
            swDest: "sw.js",
            importWorkboxFrom: "local",
        }),
    ],
    optimization: {
        minimizer: [
            new TerserPlugin({
                cache: true,
                parallel: true,
                sourceMap: true,
            }),
            new OptimizeCSSAssetsPlugin({}),
        ],
    },
});
