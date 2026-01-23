#!/bin/bash
# ~/dev/rinawarp/watch_stray.sh
# Automatically warns if a script is run outside canonical repo

CURRENT_DIR=$(pwd)
if [[ "$CURRENT_DIR" != "$RINAWARP_ROOT"* ]]; then
    echo "⚠️ Script running outside canonical RinaWarp repository!"
fi
