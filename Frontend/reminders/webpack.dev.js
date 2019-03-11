const merge = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
    mode: "development",
    devServer: {
        contentBase: "./dist",
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                enforce: "pre",
                use: [
                    {
                        loader: "tslint-loader",
                        options: { /* Loader options go here */ },
                    },
                ],
            },
        ],
    },
});
