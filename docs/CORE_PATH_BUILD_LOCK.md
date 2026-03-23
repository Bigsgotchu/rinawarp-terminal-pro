## Core Path Build Lock

Date: 2026-03-23

This lock is for stabilization only. Use one packaged Linux build, one customer path, and fix only the first blocker on that path before changing anything else.

Use this exact build for the current stabilization pass:

- Artifact: `/home/karina/Downloads/RinaWarp-Terminal-Pro-1.1.9.AppImage`
- Source artifact: `/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/dist-electron/installer/RinaWarp-Terminal-Pro-1.1.9.AppImage`
- SHA-256: `d86f4e4b65652df6ea092ced35da1f01196136fb8858d4af89f02490a958a8c7`

Core path under test:

1. Launch the packaged app
2. Choose a workspace
3. Open Settings
4. Send one plain message
5. Confirm Rina replies normally

Out of scope for this lock:

1. Deploy flows
2. Recovery polish beyond the core path
3. Capability-pack work
4. Unrelated UI refinements

Automation gate for this lock:

- `npm run qa:stabilization-core`

Do not rotate to a different AppImage during this pass unless this file is updated first.
