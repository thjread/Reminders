#!/bin/sh

# This seems to be broken
systemfd --no-pid -s http::3002 -- cargo watch -x run
