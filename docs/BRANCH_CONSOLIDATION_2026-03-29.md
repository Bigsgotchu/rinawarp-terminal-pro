# Branch Consolidation Notes

Date: 2026-03-29

## Current State

- Canonical branch should remain `main`.
- `main` is ahead of `origin/main` by 34 commits.
- The current working tree contains intentional uncommitted work, so branch switching or merge execution should wait until that work is committed.

## Local Branch Inventory

Already merged into `main`:

- `audit/store-only-blessed-path`
- `clean-restructure`
- `master`
- `refactor/split-main-ts`
- `rina/fix-170`

Not yet merged into `main`:

- `cline-task-1`

Remote branches still present:

- `origin/main`
- `origin/clean-restructure`
- `origin/cline-task-1`

## Main Source Of Confusion

`cline-task-1` is the only materially divergent branch.

- `main` contains 34 commits not in `cline-task-1`
- `cline-task-1` contains 4 commits not in `main`

This is not a simple fast-forward situation.

## Unique `cline-task-1` Commits

1. `f72b280` Ship launch-ready conversation and revenue hardening
2. `43da30e` Fix live Google Analytics site tracking
3. `31f8a89` Fix GitHub workflow repo-root paths
4. `707829a` Clean repo hygiene and keep required site changes

## Overlap Hotspots

These paths changed on both `main` and `cline-task-1`, so they are the most likely conflict areas:

- `package.json`
- `scripts/build-pages-site.mjs`
- `website/workers/marketplace/ui.ts`
- `website/workers/router.ts`
- `website/workers/seo.ts`
- `apps/terminal-pro/src/main/orchestration/conversationResponder.ts`
- `apps/terminal-pro/src/main/window/windowLifecycle.ts`
- `docs/LIVE_REVENUE_RUNBOOK.md`
- `docs/RELEASE_GATE_SCORECARD.md`

Additional overlap exists in workflows and `.gitignore`.

## Consolidation Recommendation

Use `main` as the single source of truth.

Recommended order:

1. Commit the current uncommitted work on `main`.
2. Create an integration branch from `main`.
3. Review `cline-task-1` commit-by-commit rather than merging blindly.
4. Prefer selective cherry-picks for low-risk commits.
5. Resolve overlap manually for the website/router and conversation-orchestration areas.
6. Verify builds/tests on the integration branch.
7. Merge the integration result back into `main`.
8. Delete stale merged branches locally and remotely after verification.

## Suggested Cherry-Pick Order

Likely lowest-risk first:

1. `31f8a89` Fix GitHub workflow repo-root paths
2. `43da30e` Fix live Google Analytics site tracking

Likely highest-risk and should be reviewed manually first:

1. `707829a` Clean repo hygiene and keep required site changes
2. `f72b280` Ship launch-ready conversation and revenue hardening

## Validation Status On Current `main`

These commands passed on the current branch:

```bash
npm --workspace apps/rinawarp-companion run build
npm --workspace apps/rinawarp-companion run test
npm run build
```

## Safe Cleanup After Consolidation

Once `cline-task-1` is resolved and merged, these merged local branches can be deleted:

```bash
git branch -d audit/store-only-blessed-path
git branch -d clean-restructure
git branch -d master
git branch -d refactor/split-main-ts
git branch -d rina/fix-170
```

Remote cleanup candidates:

```bash
git push origin --delete clean-restructure
git push origin --delete cline-task-1
```

Do not delete `cline-task-1` until its unique commits are either merged or explicitly discarded.
