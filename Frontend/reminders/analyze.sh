#!/bin/sh
webpack --config webpack.prod.js --stats --json > stats.json
webpack-bundle-analyzer stats.json dist
