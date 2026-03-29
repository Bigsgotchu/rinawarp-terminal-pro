# RinaWarp Release Gate Scorecard

## Standard

A build is shippable only when the paid promise is delivered under controlled proof:

- Agent-first workbench is the primary surface
- execution flows only through the canonical trusted path
- claims are backed by `runId` plus receipt/session proof
- recovery stays coherent after interruption and restart
- packaged builds work on fresh state without builder-only assumptions

## Launch Blockers

### Core promise

- [x] New user can open the app and understand what to do from the Agent surface
- [x] Rina can inspect the current workspace from the canonical path
- [x] User can trigger a real task from chat
- [x] Result is understandable in chat without opening raw logs
- [x] User can inspect proof, output, and run details when needed
- [x] Restart/recovery stays coherent

### Trust model

- [x] One blessed execution path only
- [x] No known fallback execution in the shipping path
- [x] No success wording without proof state
- [x] Output expansion comes from canonical runs/proof path
- [x] Workspace authority stays in main-process authority

### Product UX

- [x] Agent is primary surface
- [x] Runs/Terminal/Code/Diagnostics behave like inspectors
- [x] Runs inspector scopes to workspace by default
- [x] Noise/activity runs are hidden by default
- [x] Empty state is guided and product-quality
- [x] Recovery appears in-thread and in inspectors

### Conversational robustness

- [x] Rina handles vague input without breaking
- [x] Rina handles typos/fragments reasonably
- [x] Rina handles mixed social + task turns without accidental execution
- [x] Rina asks at most one necessary clarification in common ambiguous cases
- [x] Rina maintains proof discipline during conversational replies
- [x] Rina stays grounded during failure/frustration phrasing
- [x] Rina does not dead-end on normal human language
- [x] Rina preserves context for common follow-ups like `again`, `that`, and `the last one`

### Reliability

- [x] Fresh app launch is clean
- [x] Failed command path stays honest
- [x] Interrupted execution can be recovered or clearly explained
- [x] State survives restart coherently
- [x] Full Playwright shipping path is green

### Memory and personalization

- [x] Explicit owner preferences persist
- [x] Memory store is separate from proof storage
- [x] Owner-only edit/reset path exists
- [x] Inferred memories are guarded and owner-reviewed

### Packaging and installability

- [x] Linux packaged artifact builds
- [x] Packaged Linux app installs cleanly on a fresh Debian baseline via `.deb`
- [x] Packaged Windows app installs and launches cleanly on a fresh Windows 11 VM via the public `.exe` installer origin
- [x] Five packaged golden customer journeys pass on fresh state
- [x] Recursive self-packaging bug is fixed
- [x] Clean-machine install verified outside builder environment
- [ ] Upgrade/install behavior verified on more than one target machine

### Supportability

- [x] Support bundle path exists
- [x] Runs/receipts/session state are inspectable
- [x] Version/build info is visible
- [x] Release-readiness script exists
- [x] VS Code Companion validation can be run from the repo root with `npm run test:companion`

## Golden Customer Journeys

- [x] Journey A — First-use value
- [x] Journey B — Proof-backed execution
- [x] Journey C — Failure handling
- [x] Journey D — Restart/recovery
- [x] Journey E — Owner continuity

Validation lives in:

- [release-golden-journeys.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/release-golden-journeys.spec.ts)
- [agent-runproof.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/agent-runproof.spec.ts)
- [rina-conversation-resilience.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/rina-conversation-resilience.spec.ts)
- [trust-smoke.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/trust-smoke.spec.ts)
- [visual-qa.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/visual-qa.spec.ts)
- [updates.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/updates.spec.ts)

## Evidence

- `npm run build:electron`
- `npm run test:unit`
- `npm run test:companion`
- `npm run release:readiness`
- `npm run test:playwright`
- `npm run dist:linux`
- `npx playwright test tests/e2e/release-golden-journeys.spec.ts -c tests/playwright.config.ts --reporter=line`

Recent packaging evidence:

- AppImage size corrected from multi-gigabyte recursive packaging failure to roughly `119M`
- `.deb` packaging now completes successfully
- clean Debian 13 VM verification confirms:
  - live `/download/linux/deb` redirects correctly
  - the `1.1.4` Debian package installs successfully
  - package dependencies pull the required Electron desktop stack automatically
- `linux-unpacked/resources` corrected to roughly `17M`
- packaged fresh-state golden journeys now pass `5/5`

## Decision

### Verdict: Paid Early Access

RinaWarp is ready for **paid early access**, not yet for broad release.

Why:

- the core paid promise is real and repeatedly validated
- the trust/proof/recovery model is intact
- packaged Linux builds now launch from a fresh state and pass the five golden customer journeys
- packaged Windows installs now complete and launch from a fresh Windows 11 VM
- the app appears supportable by a small founder-led team

Why not broad release yet:

- packaged install/upgrade behavior still needs broader OS and environment verification
- updater/release-channel behavior is now honest and wired, but not yet validated from a shipped build that uses the new public update origins

## Broad Launch Exit Criteria

Move from paid early access to broad launch only when all of these are true:

- clean-machine install is verified on target OSes
- packaged upgrade preserves valid state safely
- installer/distributable behavior is confirmed by someone other than the builder
- support flow is exercised from a realistic customer report
- release-channel/update behavior is validated end to end
