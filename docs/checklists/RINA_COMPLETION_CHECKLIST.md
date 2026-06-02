# Rina Completion Checklist

This checklist separates three different truths:

1. the app can be launched
2. Rina is commercially credible as a paid Pro product
3. Rina is fully realized as the long-term adaptive desktop agent vision

Those are not the same milestone.

## Working Order

This is the practical sequence to complete from here, based on the current repo state.

Reference implementation plan:

- [docs/MILESTONE_1_TRUST_CONSOLIDATION.md](./MILESTONE_1_TRUST_CONSOLIDATION.md)

### A. Live revenue unlock

- [ ] Run `npm run verify:prelaunch:full` and save the result used for launch signoff.
  - Current blocker: `npm run smoke:stripe` fails because `https://api.rinawarptech.com/api/health` returns `429` with Cloudflare `error code: 1027`.
- [ ] Complete one real checkout in production.
- [ ] Confirm Stripe webhook writes entitlement correctly.
- [ ] Confirm desktop app refreshes from `starter` to paid tier.
- [ ] Confirm paid tier persists after full relaunch.
- [ ] Confirm billing portal works for the same customer.
- [ ] Confirm restore purchase works from billing email / lookup.

### B. Public install confidence

- [ ] Validate Linux install from the live public download surface on a fresh machine.
- [ ] Validate Windows install from the live public download surface.
- [ ] Validate macOS install/signing/notarization if macOS is in launch scope.
- [ ] Confirm installed app launches cleanly after install on each launch platform.
- [ ] Confirm published artifacts and checksums match what is actually linked publicly.

### C. Paid gating truth

- [x] Validate Pro-only actions are blocked without entitlement.
  - Local proof: capability thread shows `Capability locked` for Cloudflare deploy on starter tier in `test:e2e:proof`.
- [x] Validate paid actions unlock with entitlement present.
  - Local proof: seeded Pro entitlement unlocks Cloudflare capability and starts a trusted run in `test:e2e:proof`.
- [x] Validate marketplace paid gating locally against the desktop UI.
  - Local proof: starter shows a premium marketplace agent as locked, and seeded Pro entitlement enables local install in `tests/e2e/marketplace.spec.ts`.
- [x] Validate local upgrade-boundary copy against actual Pro unlock behavior.
  - Local proof: the marketplace upgrade path explains premium execution, capability packs, installable agents, and proof-backed fixes in `tests/e2e/marketplace.spec.ts`.
- [ ] Validate marketplace paid gating against the real backend, not only fallback flows.
- [ ] Validate launch copy and plan unlock copy against actual app behavior.

### D. Capability-pack execution truth

- [ ] Map plan steps to required capability packs, not only prompts.
- [ ] Show capability requirements on the plan itself before execution starts.
- [x] Route capability-pack actions into the same blessed run/receipt path.
- [ ] Remove or reduce fallback-only marketplace behavior before public launch.
- [ ] Keep upgrade/install prompts attached exactly to the capability boundary hit by the user.

### E. UI audit and polish

- [ ] Collapse inspector mental model further so Agent is clearly the home screen.
- [ ] Reduce top-level “peer mode” feeling from `Runs`, `Execution Trace`, `Workspace`, `Diagnostics`, `Brain`, and `Marketplace`.
- [x] De-emphasize the execution trace panel as a primary path.
- [ ] Decide whether Marketplace remains a primary destination or folds under capabilities/settings.
- [ ] Audit the Agent thread for any remaining stacked chrome or duplicated context.
- [x] Add proof coverage for capability-required / capability-locked / capability-install-needed thread states.
- [ ] Run a final visual audit on desktop layout hierarchy before launch signoff.

## 1. Launch-Critical

These items must be true before public launch if the claim is that Rina can safely act for users.

### Paid unlock truth

- [ ] One real checkout succeeds in production.
- [ ] Stripe webhook writes the entitlement record correctly.
- [ ] Desktop app refreshes from starter/free to paid without manual hacks.
- [ ] Paid status persists after full app relaunch.
- [ ] Billing portal works for the same customer.
- [ ] Restore purchase works from billing email / lookup.

### Proof truth

- [x] Build, test, deploy, and fix starter intents create proof-backed run blocks.
- [x] Thread-level trust snapshot exists and is exportable.
- [x] Success language is guarded by proof in the main thread.
- [ ] Production-only execution paths are validated with the same proof guarantees as local/dev flows.
- [ ] Failure, interruption, restore, and degraded-backend states are manually validated in production-like conditions.

### Public delivery truth

- [x] Public release manifest serves the current version.
- [x] Public Linux download route redirects to a real artifact.
- [x] Repo-controlled Pages deploy path exists.
- [ ] Fresh-machine install is validated from the live public download surface.
- [ ] Windows installer is validated from the live public download surface.
- [ ] macOS installer is validated if macOS is in launch scope.

### Commercial safety

- [x] Pro-only actions are truly blocked when entitlement is absent.
  - Local desktop proof is covered in the capability-thread E2E lane.
- [x] Paid actions are truly unlocked when entitlement is present.
  - Local desktop proof is covered by the seeded Pro entitlement capability-run E2E lane.
- [x] Marketplace paid gating is correct in local desktop verification.
  - Local proof is covered in `tests/e2e/marketplace.spec.ts`.
- [ ] Marketplace paid gating is correct in production, not only in local fallback flows.
- [ ] Launch copy matches the actual product behavior and plan unlocks.
- [x] Capability-pack install/upgrade states are honest in local desktop verification before execution starts.
  - Local proof covers capability-thread lock/install states and marketplace upgrade/install flows in the focused E2E lanes.

## 2. Pro-Grade Rina

These items are not strictly required to launch, but they are required before saying “Rina is fully functioning as a serious paid AI agent.”

### Execution reliability

- [ ] Rina consistently chooses the right first action for build/test/deploy/fix/diagnose tasks.
- [ ] She asks for confirmation only when risk actually requires it.
- [ ] She does not drift into dead-end or low-value plans for common developer tasks.
- [ ] Multi-step plans stay coherent across execution, retry, interruption, and recovery.
- [x] Run-to-message linkage remains correct under restore/hydration in store-backed restoration flows.

### Capability maturity

- [ ] Build flow is reliable across the main project types you intend to support.
- [ ] Test flow can summarize failures with useful next actions.
- [ ] Deploy flow handles target/environment/provider context clearly.
- [ ] Broken-project recovery is more than “run build again”; it can identify and attempt the safest fixes first.
- [ ] System Doctor is real and trustworthy enough to justify paid positioning.
- [ ] Capability packs affect plan execution, not only discovery and UI copy.
- [ ] Capability packs express proof expectations before execution starts.

### Trust maturity

- [ ] Every meaningful execution surface uses the same blessed path.
- [ ] No renderer-era or execution-side path can bypass proof behavior.
- [ ] Users can understand what happened without inspector hunting in common cases.
- [ ] Recovery state preserves evidence instead of making historical work disappear.
- [x] Capability-required, capability-locked, and capability-install-needed states are proof-first and in-thread.

### Plan/tier coherence

- [ ] Same Rina across plans is true in behavior, not only in copy.
- [ ] Capability gating is consistent across starter, Pro, Creator, and Team.
- [x] Upgrade prompts appear exactly where capability boundaries are hit.
  - Local proof covers capability-thread lock states and marketplace `Upgrade to Pro` prompts in the focused E2E lanes.
- [ ] Paid value is expressed as action depth and workflow power, not “smarter model magic.”
- [ ] Capability packs do not create a second-world product model separate from the Agent thread.

## 3. Fully Realized Rina Vision

These are the longer-horizon items required before saying the full product vision is realized.

### Adaptive intelligence

- [ ] Rina remembers stable user and workspace preferences with transparent controls.
- [ ] Her working style adapts meaningfully over time instead of resetting every session.
- [ ] She maintains continuity across related tasks, projects, and recoveries.
- [ ] Her voice and planning style feel recognizably “Rina,” not generic assistant output.

### Broader action surface

- [ ] Deploy capability packs are robust enough for repeated real-world use.
- [ ] System doctor / machine diagnosis is commercially reliable.
- [ ] Future device and environment scans are permissioned, local, proof-backed, and useful.
- [ ] Reusable workflows and chained actions are strong enough for Creator/Team value.

### Team and agency maturity

- [ ] Team workflows work across multiple projects without trust drift.
- [ ] Shared/repeatable workflow packaging exists where needed.
- [ ] Team settings and operational controls fit the same canonical execution model.
- [ ] Agency use does not introduce separate “second-world” product behavior.

## Decision Rule

Rina is:

- `Launchable` when Section 1 is green.
- `Pro-grade` when Sections 1 and 2 are green.
- `Fully realized` only when Sections 1, 2, and 3 are green.

This avoids the common mistake of calling a product complete because packaging and UI are clean while the agent itself is still only partially mature.
