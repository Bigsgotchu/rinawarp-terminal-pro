# Desktop RC Checklist

Canonical desktop RC gate:

```bash
npm run verify:desktop:rc
```

Exact automated stack:

```bash
npm run guard:no-stubs
npm run guard:no-fake-success
npm run guard:intent-contracts
npm run guard:single-owner-events
npm --workspace apps/terminal-pro run test:e2e:first-run
npm --workspace apps/terminal-pro run test:e2e:conversation
npm --workspace apps/terminal-pro run test:e2e:proof
npm --workspace apps/terminal-pro run test:e2e:packaged-first-run
npm --workspace apps/terminal-pro run build:electron
```

Final manual packaged sanity pass:

- `hi`
- `what can you do`
- `scan yourself`
- choose workspace
- `Settings`
- receipt open
- recovery card
- capability install and retry flow

Release rule:

- blocker: trust, workspace, settings, conversation, proof, packaged-only, updater, or install bug
- post-release: cosmetic or polish-only issue
