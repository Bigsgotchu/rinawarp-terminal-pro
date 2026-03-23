# Desktop RC Checklist

This is the desktop release-candidate gate for the current stabilization phase.

Use this checklist when the goal is:

1. freeze the current desktop RC
2. verify truthful behavior
3. ship without another internal reshuffle

## Automated Gate

Canonical command:

```bash
npm run verify:desktop:rc
```

Exact stack:

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

Every item above must be green before promoting a desktop RC.

## Manual Sanity

Run one final packaged-app sanity pass for human-feel surfaces:

- [ ] `hi`
- [ ] `what can you do`
- [ ] `scan yourself`
- [ ] choose workspace
- [ ] Settings
- [ ] receipt open
- [ ] recovery card
- [ ] capability install and retry flow

These are not broad exploratory tests. They are final confidence checks on the packaged artifact.

## Release Rule

Treat new issues with this split:

- blocker: trust, workspace, settings, conversation, or proof bug
- post-release: cosmetic or polish-only issue

Do not resume broad internal reshaping from this checklist. Freeze, verify, ship, then collect real customer feedback.
