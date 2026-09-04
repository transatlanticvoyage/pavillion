# vendor/

## better_sqlite3-darwin-arm64-abi118.node

A committed copy of the **only working** `better-sqlite3` native binary on this
machine (arm64, Node ABI 118 = Electron 27).

It lives here because it cannot be rebuilt: Node 26 ships node-gyp 9.4.1, whose
`gyp_main.py` imports `distutils` (removed in Python 3.12+), so any `npm rebuild` /
`npm install` fails — **after** node-gyp's clean step has already deleted
`node_modules/better-sqlite3/build/Release/better_sqlite3.node`. That happened on
2026-09-04 and silently broke the database (`Could not locate the bindings file`,
app still launches).

`node_modules/` is gitignored, so without this copy the binary is one bad `npm`
command away from being gone for good.

### Restore

```bash
mkdir -p node_modules/better-sqlite3/build/Release
cp vendor/better_sqlite3-darwin-arm64-abi118.node \
   node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

Then restart and confirm the log shows `Database initialized at: .../Pavillion/pavilion.db`
with no bindings error.
