# Current Release Status for RinaWarp Terminal Pro

## Released Versions
- **Latest Released Version:** v1.0.4 (2026-03-17)
  - Available platforms: Linux (AppImage, deb), macOS (dmg), Windows (exe)
  - Release notes: See RELEASE_NOTES_1.1.10.md (note: version numbering discrepancy suggests possible documentation gap)
  - Downloads: https://rinawarp-downloads.rinawarptech.workers.dev/releases/1.0.4/

## Current Development State
- **Current Package Version:** 1.8.2-beta (as of package.json in rinawarp-production)
- **Latest Git Tag:** v1.8.0-beta
- **Commits Since Last Tag:** 15 commits (primarily fixes, tests, documentation)
- **Current Branch:** main (ahead of origin/main by 1 commit)

## Version Discrepancy Analysis
There appears to be a discrepancy between:
- Released version: v1.0.4 (March 2026)
- Current development version: 1.8.2-beta (June 2026)

This suggests either:
1. Version numbering scheme has changed or been reset
2. Documentation/tags/releases are not in sync with actual development
3. The v1.0.4 release refers to a different component or versioning system

## Release Preparation Status
- **Version Bump Recommendation:** patch (would make v1.8.1-beta based on conventional commits analysis)
- **Release Readiness:** Requires running `npm --workspace apps/terminal-pro run release:readiness`
- **Artifacts to Build:** 
  - RinaWarp-Terminal-Pro-1.8.1-beta.AppImage
  - RinaWarp-Terminal-Pro-1.8.1-beta.deb
  - RinaWarp-Terminal-Pro-1.8.1-beta.exe
  - Associated checksums and metadata

## Next Steps for Release
1. Confirm canonical versioning scheme (investigate v1.0.4 vs 1.8.x discrepancy)
2. Apply version bump: `bash scripts/release/apply-version-bump.sh <version>`
3. Generate changelog: `bash scripts/release/generate-changelog.sh <version>`
4. Run release readiness checks
5. Build release artifacts: `bash deploy/release-runner.sh`
6. Verify artifacts: `npm run verify:downloads`
7. Publish release: `npm run release:publish:desktop`
8. Audit and smoke test: `npm run audit:prod && npm run smoke:prod`

## Known Issues/Gaps
- Need to reconcile version numbering between released artifacts (v1.0.4) and current development (1.8.2-beta)
- Release documentation may need updating to reflect current versioning scheme
- Changelog generation should be based on commits since v1.8.0-beta, not v1.0.4