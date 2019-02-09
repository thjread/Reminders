#!/bin/sh
webpack --stats --json > stats.json
webpack-bundle-analyzer stats.json dist
