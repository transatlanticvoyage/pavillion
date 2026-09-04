#!/bin/bash
# Restart the installed Pavillion at /Applications/Pavillion.app.
# NEVER run `electron .` / launch_pavilion.command from this repo — that spawns a
# second, separate instance and you get two Pavillion icons in the Dock.

APP="/Applications/Pavillion.app"

# 1. Graceful quit first so before-quit runs (closes the SQLite handle cleanly
#    and unregisters the F9 global shortcut).
osascript -e 'quit app "Pavillion"' 2>/dev/null
for i in $(seq 1 20); do
  pgrep -f "$APP/Contents/MacOS/Pavillion" >/dev/null || break
  sleep 0.25
done

# 2. Fallback: kill by full binary path, not the bare name.
pkill -f "$APP/Contents/MacOS/Pavillion" 2>/dev/null
pkill -f "electron.*desktop-apps/Pavillion" 2>/dev/null
sleep 0.5

# 3. Re-apply the ad-hoc signature (macOS 15 will not Dock-launch a broken seal).
codesign --force --deep --sign - "$APP" 2>/dev/null

# 4. Launch. Contents/Resources/app is a symlink to this repo, so whatever is on
#    disk here is what runs — no rebuild step.
open "$APP"
