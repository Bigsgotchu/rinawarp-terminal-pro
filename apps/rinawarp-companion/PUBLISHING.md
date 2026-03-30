# Publishing RinaWarp Companion

This extension is set up for a Preview-first Marketplace rollout.

Canonical launch decision gate:

- [PRE_RELEASE_GO_NO_GO.md](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/PRE_RELEASE_GO_NO_GO.md)
- [MANUAL_VERIFICATION_RUNBOOK.md](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/MANUAL_VERIFICATION_RUNBOOK.md)

## Packaging

Build the extension:

```bash
npm --workspace apps/rinawarp-companion run build
```

Create a pre-release VSIX:

```bash
npm --workspace apps/rinawarp-companion run package:vsix
```

Create a versioned pre-release VSIX:

```bash
npm --workspace apps/rinawarp-companion run package:vsix:versioned
```

## Publishing

Publish a pre-release:

```bash
npm --workspace apps/rinawarp-companion run publish:pre-release
```

Publish a full release:

```bash
npm --workspace apps/rinawarp-companion run publish:release
```

## Notes

- `vsce` must be installed in the workspace before packaging or publishing.
- This repo currently targets Node 18 for the extension workflow, so prefer the `vsce` 2.x line unless you upgrade the packaging runtime to Node 20+.
- In this monorepo, use the built-in `--no-dependencies` packaging flow because Companion ships a self-contained payload from `dist/**` and `media/**`, and root-level extraneous modules can confuse `vsce`'s dependency scan.
- The scripts intentionally pin `vsce@2.15.0` so Node 18 environments do not accidentally pick up a newer transient CLI through plain `npx`.
- On this machine, the scripts also invoke `npx-cli.js` through `/usr/bin/node` directly so publish/package does not fall back to an older shell-managed Node runtime.
- The scripts also preload a tiny `File`/`Blob` compatibility shim so `vsce` does not crash if a Node 18 shell still touches the publish chain.
- The package is configured as `preview: true` and `pricing: "Trial"` to match the current rollout plan.
- URI callbacks require the published extension id `rinawarp.rinawarp-companion`.
- Test pre-release installs locally before publishing broadly.

## Recommended order

1. Build the extension.
2. Package a VSIX and install it locally.
3. Verify account connect, diagnostic flow, pack deep links, and purchase return flow.
4. Publish as pre-release first.
5. Watch install-to-activation feedback before moving to a full release.
