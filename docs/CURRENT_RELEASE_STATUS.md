# Current Release Status for RinaWarp Terminal Pro

## Released Versions
- **Latest Public Released Version:** v1.0.4 (2026-03-17)
  - Available platforms: Linux (AppImage, deb), macOS (dmg), Windows (exe)
  - Release notes: See RELEASE_NOTES_1.1.10.md
  - Downloads: https://rinawarp-downloads.rinawarptech.workers.dev/releases/1.0.4/
  - Note: This appears to be a legacy release line. Current development is on the 1.8.x-beta track.

## Current Development State
- **Current Package Version:** 1.8.2-beta (as of package.json in rinawarp-production)
- **Latest Git Tag:** v1.8.0-beta
- **Commits Since Last Tag:** 15 commits (primarily fixes, tests, documentation)
- **Current Branch:** ai/v1.8-beta-real-workflows (ahead of origin/main by 2 commits)

## Version Lines Clarification
There are two active version lines:
1. **Public Release Line:** v1.0.x (latest: v1.0.4, March 2026) - appears to be legacy/maintenance
2. **Private Development Line:** 1.8.x-beta (current: 1.8.2-beta, June 2026) - active development

The v1.0.4 release appears to be from a different versioning scheme or component. All active development is on the 1.8.x-beta track as evidenced by:
- package.json versions in root and apps/terminal-pro
- git tags showing v1.8.0-beta as latest
- current work being done on 1.8.x-beta features

## Current Implementation Status (1.8.2-beta)
**Working Features:**
- Agent system with JSON-based agent definitions
- Runtime-owned AgentThreadBlock execution tracking
- Proof-based verification system (no UI-owned fake state)
- Approval-gated mutation system
- Disk recovery diagnostics (read-only)
- Port conflict diagnostics (read-only)
- Failed build recovery workflows
- Basic receipt generation and display
- Workbench thread-first rendering architecture

**Known Limitations/Gaps:**
- No cloud memory systems (intentionally omitted per constraints)
- No embeddings/ranking systems (intentionally omitted per constraints)
- No duplicate thread systems (single canonical thread enforced)
- UI does not own execution state (runtime owns truth)
- No mutation without explicit approval
- No public release without explicit instruction

## Release Preparation Status (1.8.2-beta)
- **Current Package Version:** 1.8.2-beta
- **Latest Git Tag:** v1.8.0-beta
- **Next Candidate Version:** 1.8.2-beta (maintaining current package version unless intentionally changed)
- **Release Readiness:** Requires running `npm --workspace apps/terminal-pro run release:readiness`
- **Artifacts to Build (for validation):**
  - RinaWarp-Terminal-Pro-1.8.2-beta.AppImage
  - RinaWarp-Terminal-Pro-1.8.2-beta.deb
  - RinaWarp-Terminal-Pro-1.8.2-beta.exe
  - Associated checksums and metadata

## Next Steps for Private Validation
1. Confirm canonical versioning scheme (1.8.x-beta is active development line)
2. Treat v1.0.4 as latest public release and 1.8.2-beta as current private/dev line
3. Generate changelog from v1.8.0-beta to HEAD
4. Run release readiness checks
5. Build local/private artifacts
6. Verify updater metadata
7. Verify downloads locally/private only
8. Do not publish, tag, or public release until explicitly approved

## Known Issues/Gaps
- Public release line appears to be v1.0.4 (legacy)
- Current development line is 1.8.2-beta (active)
- Latest git tag is v1.8.0-beta
- Need to confirm whether 1.8.x-beta is private beta/dev-only or intended public successor
- Changelog should be based on commits since v1.8.0-beta
- Release documentation needs reconciliation between version lines

## Immediate Next Milestone
v1.8.2-beta Real Workflow Expansion (current branch: ai/v1.8-beta-real-workflows)
