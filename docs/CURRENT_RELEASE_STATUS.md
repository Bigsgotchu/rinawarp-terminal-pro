# Current Release Status for RinaWarp Terminal Pro

## Released Versions
- **Current Public Beta Version:** v1.8.2-beta
  - Available public beta platforms: Linux (AppImage, deb)
  - Release notes: See `docs/releases/v1.8.2-beta.md`
  - Downloads: `https://www.rinawarptech.com/download/linux/appimage` and `https://www.rinawarptech.com/download/linux/deb`
  - Note: Older v1.0.x and 1.1.x docs remain historical release records, not the current public beta truth.

## Current Development State
- **Current Package Version:** 1.8.2-beta
- **Latest Public Beta Tag:** v1.8.2-beta
- **Current Branch:** main

## Version Lines Clarification
There is one current beta release line:
1. **Controlled Linux Public Beta:** v1.8.2-beta - current revenue-testing line

The v1.0.x and 1.1.x records are historical. Current release status should be judged from:
- package.json versions in root and apps/terminal-pro
- live `/releases/latest.json`
- public Linux download routes
- production smoke, audit, Stripe, and download verification checks

## Controlled Beta Readiness Note

RinaWarp Terminal Pro v1.8.2-beta has live production surfaces, working Linux public downloads, live Stripe checkout routing, healthy API checks, and passing production smoke/audit checks. The product is ready for controlled Linux beta revenue testing with founder-led support. The remaining production gate is the full customer revenue loop: purchase, entitlement webhook, desktop unlock, relaunch persistence, restore purchase, billing portal access, and support recovery without manual intervention.

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
- **Latest Public Beta Tag:** v1.8.2-beta
- **Next Candidate Version:** 1.8.2-beta (maintaining current package version unless intentionally changed)
- **Release Readiness:** Requires running `npm --workspace apps/terminal-pro run release:readiness`
- **Artifacts to Build (for validation):**
  - RinaWarp-Terminal-Pro-1.8.2-beta-linux-x86_64.AppImage
  - RinaWarp-Terminal-Pro-1.8.2-beta-linux-amd64.deb
  - Associated checksums and metadata

## Next Steps for Controlled Linux Public Beta Revenue Testing
1. Keep public positioning limited to Linux early-access beta.
2. Run release readiness checks.
3. Build local Linux artifacts.
4. Verify updater metadata.
5. Verify public Linux downloads.
6. Prove the full purchase, entitlement, desktop unlock, relaunch, restore, and billing portal loop.

## Known Issues/Gaps
- macOS and Windows are not the current public beta promise.
- The product is not fully production-ready like Warp.dev.
- The mature zero-touch customer loop still needs repeated proof from real customers.
- Release documentation should preserve historical entries while keeping current-status docs aligned to v1.8.2-beta.

## Immediate Next Milestone
v1.8.2-beta controlled Linux paid beta verification.
