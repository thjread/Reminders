#!/bin/sh
convert -background transparent "src/images/logo512.png" -define icon:auto-resize=16,32,48,64 "src/favicon.ico"
