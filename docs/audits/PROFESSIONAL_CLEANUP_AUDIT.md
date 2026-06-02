# RinaWarp Professional Cleanup Audit

Date: 2026-06-01

Scope: audit-only. No files were deleted, staged, or committed during this pass.

## Executive Summary

- Canonical product should be narrowed to RinaWarp Terminal Pro: chat -> plan -> execute -> stream -> receipt -> memory.
- The repo still contains multiple product directions, including Matter Intelligence, VS Code Companion, agents marketplace, deploy capability packs, old release docs, and generated artifact trees.
- The local codebase is currently versioned as `1.8.2-beta`, but live updater/public release surfaces still advertise `1.8.1-beta`.
- Local build and desktop packaging pass for `1.8.2-beta`; public updater checks fail because GitHub/latest and `releases.json` are behind.
- `npm run smoke:prod` fails against the live site because `/downloads` redirects to apex `https://rinawarptech.com/downloads` instead of the expected `/download/` contract.
- Canonical privacy docs requested by the audit, `docs/PRIVACY.md` and `docs/TELEMETRY.md`, are missing; privacy copy exists only inside website source.
- There are source-adjacent backup/orig files and many old release artifacts in ignored build trees that should be cleaned only after approval.

## Canonical Product

What stays:

- `apps/terminal-pro` as the main desktop app.
- Runtime path that supports chat -> plan -> execute -> stream -> receipt -> memory:
  - `apps/terminal-pro/src/main/ipc/registerAgentExecutionIpc.ts`
  - `apps/terminal-pro/src/renderer/services/agentExecutionFlow.ts`
  - `apps/terminal-pro/src/workbench/runBlocks/`
  - `apps/terminal-pro/src/main/ipc/registerMemoryIpc.ts`
  - `packages/rina-runtime`
  - `packages/runtime-*`
- Safety and proof gates:
  - `scripts/guards/check-product-constraint-contract.mjs`
  - `scripts/guards/check-rina-legacy.mjs`
  - `apps/terminal-pro/test/legacy-mutation-paths.test.mjs`
  - `apps/terminal-pro/test/rina-agent-safe-patch.test.mjs`
- Release/download verification:
  - `scripts/qa/verify-download-links.mjs`
  - `scripts/qa/verify-pages-routes.mjs`
  - `scripts/qa/verify-updater-upgrade-path.mjs`
  - `scripts/check-updater.sh`

## Product Surface Inventory

Core Product:

- Agent Thread / chat input: keep as the primary user workflow.
- Plan, execute, stream, receipt flow: keep as the core trust loop.
- Runs, receipts, and proof inspectors: keep as supporting proof surfaces.
- Workspace picker/default workspace/demo workspace controls: keep, but keep demo language subordinate to real-project use.
- Settings, About, Updates, Privacy/Telemetry: keep; these are trust and release surfaces.
- Download page, Linux `.deb`, AppImage, release manifests, checksums: keep.
- Billing/pricing/restore paths for Terminal Pro: keep if they remain wired to real checkout and entitlement recovery.
- Operational telemetry opt-in/privacy controls: keep if payloads remain privacy-safe.

Advanced Tool:

- Terminal/PTY inspector: keep as a supporting execution inspector, not the product center.
- Capability packs and secure-agent execution: keep only if every path routes through approval, receipts, and proof.
- Team/account/auth settings: keep only if entitlement and account flows are real and supportable.
- Support bundles and diagnostics: keep as opt-in troubleshooting surfaces.

Archive Candidate:

- Matter Intelligence website pages/routes and migrations: archive unless it is explicitly retained as a separate product.
- VS Code Companion app and docs: archive unless it has an active business owner and release plan.
- Marketplace/agents public site surfaces: archive unless they are part of Terminal Pro's current paid promise.
- Deploy capability packages and proof scripts: archive unless they are used by current Terminal Pro workflows.
- Old 1.1.x release, launch, and strategy docs: archive under `docs/archive/`.
- Demo/prelaunch recorder tooling: archive unless tied to current release validation.

Remove:

- Source-adjacent backup/orig files after approval.
- Generated local build output after release evidence is preserved.
- Broken/obsolete route contracts once redirects are replaced by tested canonical routes.
- React-only E2E tests that target UI surfaces no longer shipped.

## P0 Must Fix Before Public Push

- Release/update mismatch:
  - Local package versions are `1.8.2-beta`.
  - `npm run check:updater` fails because GitHub latest `latest-linux.yml` reports `1.8.1-beta`, expected `1.8.2-beta`.
  - `npm run check:updater:upgrade` fails because GitHub latest and `releases.json` beta channel still advertise `1.8.1-beta`.
  - Classification: fix.
- Live website redirect contract failure:
  - `npm run smoke:prod` fails at `/downloads`.
  - Actual live redirect: `https://www.rinawarptech.com/downloads` -> `https://rinawarptech.com/downloads`.
  - Expected contract: redirect to `/download/`.
  - Classification: fix.
- Product scope confusion:
  - `website/workers/router.ts` presents RinaWarp as a two-product company and has Matter Intelligence pages/routes.
  - This conflicts with the audit scope that RinaWarp has one real product: RinaWarp Terminal Pro.
  - Classification: unknown until approved; likely archive or remove from public primary nav.
- Missing canonical privacy docs:
  - `docs/PRIVACY.md` missing.
  - `docs/TELEMETRY.md` missing.
  - Website privacy copy exists in `website/workers/router.ts`, but the repo lacks the requested canonical docs.
  - Classification: fix.

## P1 Fix During v1.8.x

- Backup/orig source files should be removed after approval:
  - `apps/terminal-pro/src/renderer/components/ChatScreen.tsx.backup`
  - `apps/terminal-pro/src/renderer/components/RinaPanel.tsx.backup`
  - `apps/terminal-pro/src/renderer/components/RinaPanel.tsx.backup2`
  - `apps/terminal-pro/src/renderer/components/RinaPanel.tsx.orig`
  - Classification: delete after approval.
- Generated artifacts/build trees should remain ignored and be cleaned from working directories after approved release evidence is preserved:
  - `apps/terminal-pro/dist-electron`
  - `apps/terminal-pro/dist-renderer`
  - `apps/terminal-pro/test-results`
  - `website/.pages-dist`
  - `website/.wrangler`
  - `.wrangler`
  - `output`
  - `artifacts`
  - Classification: delete local generated output after approval.
- Old release artifacts are present locally:
  - `apps/terminal-pro/dist-electron/installer/RinaWarp-Terminal-Pro-1.5.0-beta.*`
  - `apps/terminal-pro/dist-electron/installer/RinaWarp-Terminal-Pro-1.7.1-beta.*`
  - `apps/terminal-pro/dist-electron/installer/RinaWarp-Terminal-Pro-1.7.2-beta.*`
  - `apps/terminal-pro/dist-electron/installer/RinaWarp-Terminal-Pro-1.8.0-beta.*`
  - `apps/terminal-pro/dist-electron/installer/RinaWarp-Terminal-Pro-1.8.1-beta.AppImage`
  - `release/v1.0.4/*`
  - Classification: archive/delete generated local artifacts after approval.
- Docs are highly duplicated and conflict-prone:
  - Many `1.1.x` signoff/release docs remain active under `docs/`.
  - Requested canonical docs are not present except `docs/VALIDATION_RESULTS.md`.
  - Classification: archive old release docs and create/consolidate canonical docs after approval.

## P2 Later Cleanup

- `apps/rinawarp-companion` appears to be a second app/workspace. If Terminal Pro is the only real product, it should be archived or clearly marked non-canonical.
- `packages/rinawarp-dashboard`, `packages/rinawarp-plugins`, `packages/rinawarp-deploy-capabilities`, and `services/rina-cloud-api` may be non-core or future-facing. They need owner decisions before deletion.
- `combined-worker.js`, `stripe-payment-links.js`, `stripe-webhook-worker.js`, `tools/prelaunch-verification.ts`, and launch/demo scripts look like old operations or prototype surfaces.
- Old archive tags and branches should be pruned only after release provenance is backed up.

## Keep

- `apps/terminal-pro`
- `packages/rina-runtime`
- `packages/rina-core`
- `packages/rina-doctor`
- `packages/rinawarp-safety`
- `packages/runtime-contracts`
- `packages/runtime-core`
- `packages/runtime-feature-*`
- `packages/runtime-platform-electron`
- `scripts/guards`
- `scripts/qa`
- `docs/VALIDATION_RESULTS.md`
- `docs/IPC_NARROWING_INVENTORY.md`
- `docs/MILESTONE_1_TRUST_CONSOLIDATION.md`

## Archive

- `apps/terminal-pro/archive`
- Old release docs:
  - `docs/RELEASE_*1.1*`
  - `docs/LAUNCH_REVIEW_1.1.10_48H.md`
  - `docs/POST_RELEASE_1.1.10_OPERATIONS.md`
  - `docs/final-launch-signoff.md`
  - `docs/CORE_PATH_BUILD_LOCK.md`
- Strategy/planning docs that are not current release truth:
  - `docs/COMPANY_STRATEGY_2026-03-29.md`
  - `docs/PRODUCT_SUITE_STRATEGY_2026-03-29.md`
  - `docs/VS_CODE_EXTENSION_REVENUE_PLAN.md`
  - `plans/launch-plan.md`
- Product surfaces outside Terminal Pro pending owner decision:
  - `apps/rinawarp-companion`
  - Matter Intelligence website routes and worker API paths.

## Delete

Safe to delete after approval:

- Backup/orig files:
  - `apps/terminal-pro/src/renderer/components/ChatScreen.tsx.backup`
  - `apps/terminal-pro/src/renderer/components/RinaPanel.tsx.backup`
  - `apps/terminal-pro/src/renderer/components/RinaPanel.tsx.backup2`
  - `apps/terminal-pro/src/renderer/components/RinaPanel.tsx.orig`
- Local generated output:
  - `apps/terminal-pro/dist-renderer`
  - `apps/terminal-pro/test-results`
  - `website/.pages-dist`
  - `output`
- Old local installer artifacts, after confirming no validation proof depends on them:
  - stale files under `apps/terminal-pro/dist-electron/installer/`
  - `release/v1.0.4/`

## Unknown

- Whether Matter Intelligence should remain public, be archived, or move to a separate repo.
- Whether `apps/rinawarp-companion` is an active product, lead magnet, or stale prototype.
- Whether deploy capability packages are part of Terminal Pro's current product promise or old expansion work.
- Whether `services/rina-cloud-api` is production-critical for licensing/checkout or should be narrowed to the website Worker.
- Whether old archive tags must remain for compliance/release provenance.

## Website Issues

- `npm run verify:downloads`: pass.
- `npm run verify:site`: pass.
- `npm run smoke:prod`: fail.
- Live `/downloads` redirect does not match the expected `/download/` contract.
- Website source still contains two-product/Matter Intelligence positioning:
  - `website/workers/router.ts`
  - `website/workers/seo.ts`
  - `website/migrations/2026-04-13-matter-intelligence-foundation.sql`
  - `website/migrations/2026-04-15-mi-runtime-api.sql`
- Public beta download source is mostly honest about Linux-only beta and Windows unavailability in `website/workers/router.ts`.
- The privacy page says telemetry avoids full repository content, and the Worker rejects forbidden telemetry keys, but this is not mirrored in canonical docs.

## Release/Updater Issues

- Current local versions:
  - `package.json`: `1.8.2-beta`
  - `apps/terminal-pro/package.json`: `1.8.2-beta`
- Local desktop package build succeeded and generated:
  - `apps/terminal-pro/dist-electron/installer/RinaWarp-Terminal-Pro-1.8.2-beta.AppImage`
  - `apps/terminal-pro/dist-electron/installer/RinaWarp-Terminal-Pro-1.8.2-beta.deb`
  - `apps/terminal-pro/dist-electron/installer/latest.yml`
  - `apps/terminal-pro/dist-electron/installer/latest-linux.yml`
- `npm run check:updater`: fail; live latest is `1.8.1-beta`, expected `1.8.2-beta`.
- `npm run check:updater:upgrade`: fail; GitHub latest and `releases.json` beta channel advertise `1.8.1-beta`.
- No R2 dependency is required for the beta updater path per current GitHub URLs, but live metadata must be advanced to `1.8.2-beta`.
- Tag list contains many old beta/stable tags plus archive tags. Keep until release provenance policy is approved.

## Safety/Mutation Issues

- Guarded/fail-closed:
  - `apps/terminal-pro/src/rina/tools/filesystem.ts`
  - `apps/terminal-pro/src/rina/agents/refactorAgent.ts`
  - `apps/terminal-pro/test/legacy-mutation-paths.test.mjs`
- Approved/sandboxed paths appear to run through runtime execution and safe patch tests:
  - `apps/terminal-pro/test/rina-agent-safe-patch.test.mjs`
  - `apps/terminal-pro/src/renderer/services/agentExecutionFlow.ts`
- Needs cleanup/classification:
  - `apps/terminal-pro/src/rina/agents/devopsAgent.ts` calls `terminal.execute(...)` for install/build/docker operations; verify it is unreachable or approval-gated in current product.
  - `apps/terminal-pro/src/rina/agents/builderAgent.ts` calls `terminal.execute(...)`; verify it routes through the canonical runtime boundary or archive it.
  - `packages/rinawarp-agentd/src/context/code-index.ts` and plugin manager contain stubs/placeholders; classify as active runtime or archive.
  - `services/rina-cloud-api/src/index.ts` writes JSON state with `fs.writeFileSync`; verify production data path and privacy posture.
- Test-only destructive strings are present and should remain test-only:
  - `rm -rf /` safety tests.
  - simulated crash/failure tests under deploy capability package.

## IPC/Handler Issues

- `window.rina` is the canonical bridge in `apps/terminal-pro/src/preload.ts`.
- Product-realness guard passed during build: renderer shell and preload API references are clean.
- Potential narrowing targets:
  - Broad preload surface in `apps/terminal-pro/src/preload.ts` exposes many product areas, including auth, team, marketplace, secure agents, capabilities, cloud checkout, and Matter/companion-adjacent surfaces.
  - Consolidated daemon handlers still expose legacy-style `rina:runAgent`, `rina:conversation:route`, and `rina:conversation:turn` paths in `apps/terminal-pro/src/main/ipc/consolidated/registerDaemonHandlers.ts`.
  - Renderer files still reference legacy panels and backup files. Backup files should be deleted after approval.
- Existing IPC inventory to keep/use:
  - `docs/IPC_NARROWING_INVENTORY.md`
  - `apps/terminal-pro/tests/e2e/ipc-contracts.spec.ts`

## Privacy/Telemetry Issues

- Missing canonical docs:
  - `docs/PRIVACY.md`
  - `docs/TELEMETRY.md`
- Desktop operational telemetry path:
  - `apps/terminal-pro/src/main/telemetry/operationalTelemetry.ts`
  - `apps/terminal-pro/src/main/ipc/registerOperationalTelemetryIpc.ts`
  - `apps/terminal-pro/src/renderer/services/rendererTelemetry.ts`
- Worker rejects forbidden telemetry payload keys including prompt, repo, repoPath, username, token, and secret in `website/workers/router.ts`.
- Website privacy copy says desktop telemetry is intended for product health/workflow outcomes, not full repository content.
- Open item: add canonical docs and tests asserting telemetry never sends prompts, repo paths, source code, terminal output, file contents, usernames, tokens, or secrets.

## Test Issues

- Existing tests cover important safety and runtime paths:
  - `npm --workspace apps/terminal-pro run test:rina-runtime`: pass.
  - `npm --workspace packages/rina-doctor run test:trust`: pass.
  - `apps/terminal-pro/tests/e2e/updater-discoverability.spec.ts` exists.
  - `apps/terminal-pro/tests/e2e/customer-journey.spec.ts` exists.
- Obsolete or suspect tests to review:
  - `apps/terminal-pro/tests/e2e/react-chat-ui.spec.ts` was modified in the dirty worktree and likely targets older React-only UI assumptions.
  - `apps/terminal-pro/tests/e2e/example.spec.ts`
  - `apps/terminal-pro/tests/e2e/first-run-example.spec.ts`
  - demo-oriented tests if demo project is no longer a first-class customer path.
- Missing or incomplete:
  - Packaged installed-user updater proof remains manual.
  - Customer journey should explicitly prove current public beta discovery, update messaging, and first Agent Thread run on the installed artifact.
  - Telemetry privacy assertions should cover both desktop payload construction and Worker receiver rejection.

## Git History / Branch Cleanliness

- Current branch: `main`.
- Other local branch: `v1.6.1-beta-hardening`.
- Remote canonical branch: `origin/main`.
- Recent commits show v1.8 beta/download work and duplicate `fix: simplify workbench empty state` commits.
- Tags include many old release tags from `v1.0.4` through `v1.8.0-beta` plus archive tags.
- Dirty worktree existed before this audit and remains dirty. Notable uncommitted paths:
  - `apps/terminal-pro/package.json`
  - `package.json`
  - updater/update settings files
  - renderer settings/workbench files
  - `docs/VALIDATION_RESULTS.md`
  - untracked `apps/terminal-pro/src/renderer/services/operationalChrome.ts`
  - untracked `apps/terminal-pro/tests/e2e/updater-discoverability.spec.ts`
  - untracked `scripts/qa/verify-updater-upgrade-path.mjs`
  - this audit report

## Validation Commands

- `git status --short`: dirty worktree; no staging performed.
- `npm --workspace apps/terminal-pro run test:rina-runtime`: pass.
- `npm --workspace packages/rina-doctor run test:trust`: pass.
- `corepack pnpm build`: pass.
- `corepack pnpm dist:desktop`: pass; generated fresh `1.8.2-beta` AppImage, deb, and update metadata. Packaging emitted non-fatal npm `recursive` warnings and electron-builder hardlink fallback messages.
- `npm run verify:downloads`: pass.
- `npm run verify:site`: pass.
- `npm run smoke:prod`: fail; `/downloads` live redirect mismatch.
- `npm run check:updater`: fail; live latest metadata reports `1.8.1-beta`, expected `1.8.2-beta`.
- `npm run check:updater:upgrade`: fail; GitHub latest and `releases.json` beta channel advertise `1.8.1-beta`.

## Recommended Cleanup Commits

1. repo hygiene
   - Remove approved backup/orig files.
   - Clean generated local artifacts after release evidence is preserved.
2. website truth cleanup
   - Fix `/downloads` redirect contract.
   - Reconcile one-product public positioning.
   - Keep Windows download unavailable until a verified `.exe` exists.
3. stale test cleanup
   - Remove or rewrite obsolete React/demo-only tests.
   - Keep/update customer journey and updater discoverability tests.
4. legacy mutation cleanup
   - Archive unreachable legacy agents or prove they route through canonical runtime approval/receipt paths.
5. docs consolidation
   - Create `docs/PRODUCT_VISION.md`.
   - Create `docs/CURRENT_RELEASE_STATUS.md`.
   - Create `docs/NEXT_RELEASE_PLAN.md`.
   - Keep `docs/VALIDATION_RESULTS.md` as the validation log.
   - Create `docs/AI_ASSISTANT_RULES.md`.
   - Create `docs/PRIVACY.md`.
   - Create `docs/TELEMETRY.md`.
   - Archive old `1.1.x` release/signoff docs.
6. release/updater cleanup
   - Publish or correct `1.8.2-beta` GitHub release metadata.
   - Update `releases.json` beta channel.
   - Re-run updater checks and smoke gates.
