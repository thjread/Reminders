const merge = require('webpack-merge');
const common = require('./webpack.common.js');

const WorkboxPlugin = require('workbox-webpack-plugin');

module.exports = merge(common, {
    mode: 'production',
    plugins: [
        new WorkboxPlugin.GenerateSW({
            /*clientsClaim: true,
              skipWaiting: true,*/
            runtimeCaching: [
                {
                    urlPattern: new RegExp('https://fonts.googleapis.com/'),
                    handler: 'StaleWhileRevalidate'
                },
                {
                    urlPattern: new RegExp('https://fonts.gstatic.com/'),
                    handler: 'CacheFirst'
                }
            ],
            swDest: 'sw.js',
            importWorkboxFrom: 'local'
        })
    ]
});
