# Terminal Pro: Dev and Packaging

## Single commands

- Dev run: `npm run dev:terminal-pro`
- Package desktop app: `npm run release:desktop`
- CI-safe AppImage + smoke verify: `npm run verify:appimage:ci`

## Notes

- Build outputs are cleaned with `npm run clean`.
- Runtime resource resolution is deterministic via `resolveResourcePath(...)` in Terminal Pro main process.
- Diagnostics IPC `rina:diagnostics:paths` reports active/resolved file paths and hashes.
