OLD APP ICONS — full size, NO MARGIN (backed up 2026-11-02)

These are the icons this app used before 2026-11-02. Their artwork filled
~94% of the icon square (Pavillion: 100%, square corners), so next to
standard Mac apps (Apple's grid: 824px artwork on a 1024 canvas, ~80%) they
looked oversized in the Dock / Saber Dock.

Replaced by assets/icon.icns (and, where the app sets its Dock icon at
runtime, assets/icon-dock.png) with Apple's margin.

To revert:
  cp assets/old-icons-full-size-no-margin/icon-old-full-size-no-margin.icns assets/icon.icns
  cp assets/old-icons-full-size-no-margin/icon-old-full-size-no-margin.png  assets/icon.png
then copy assets/icon.icns into /Applications/<App>.app/Contents/Resources/icon.icns
and re-sign:  codesign --force --sign - --preserve-metadata=entitlements,requirements,flags,runtime /Applications/<App>.app

This app also sets its Dock icon at runtime from assets/icon-dock.png (main.js);
to revert that too, point main.js back at assets/icon.png. assets/icon.png itself
was not changed here (it is the in-app logo / window icon).
