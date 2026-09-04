#!/bin/bash
# Deprecated: this used to run `npm start`, which launches a SECOND Electron
# instance separate from /Applications/Pavillion.app (two Dock icons).
# It now defers to the installed app.
cd "$(dirname "$0")"
./restart-app.sh
