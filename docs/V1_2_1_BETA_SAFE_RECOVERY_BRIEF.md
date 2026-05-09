# Rina v1.2.1-beta Safe Recovery Brief

## Product Principle

No invisible magic. Measured recovery, with consent.

## Positioning

Rina helps developers recover broken local workflows safely.

## Operating Promise

Rina diagnoses local machine problems, explains the risk, asks before changing anything, executes only approved actions, then proves what improved.

## Trust Loop

`inspect -> explain -> propose -> approve -> execute -> verify`

This loop is the product. It must remain visible to the user and present in the run report.

## v1.2.1-beta Scope

Release goal: Trust Experience Polish.

The flagship workflow is safe disk recovery for developer machines.

Included:
- Calmer copy.
- Before/after disk usage evidence.
- More visible evidence in the UI and report.
- Plain-language explanation for each cleanup candidate.
- Risk and reversibility labels for every proposed action.
- Command/action preview before execution.
- Clearer approval boundaries.
- Explicit approval before any mutation.
- Calm progress states during the recovery flow.
- Stronger post-cleanup verification summaries.
- Recovery history entry with approved, declined, skipped, failed, and completed actions.

Excluded:
- Broad feature additions.
- Broader autonomous agent behavior.
- Silent cleanup.
- Background cleanup without user initiation.
- Claims of rollback where rollback is not actually available.
- General-purpose "AI does everything" positioning.

## Internal Product Test

For every recovery UI state, message, and report field, ask:

> If my machine were actually in trouble, would this make me feel more or less confident?

If the answer is less confident, rewrite it.

## Disk Recovery Flow

1. Inspect disk pressure and likely cleanup areas with read-only checks.
2. Explain the pressure source and why each candidate is safe, risky, reversible, or irreversible.
3. Propose a small set of cleanup actions in least-risk order.
4. Ask approval for each mutation, with typed confirmation for high-impact deletion.
5. Execute only approved actions.
6. Verify disk usage after cleanup.
7. Report the before/after delta, residual risk, and next recommended step if pressure remains.

## Progress States

Use calm, explicit state transitions:

- Inspecting disk usage.
- Analyzing safe cleanup candidates.
- Waiting for approval.
- Cleaning approved target.
- Verifying recovered space.
- Recovery complete.

## Evidence Contract

Every completed recovery report must include:

- Before disk usage.
- Cleanup candidates shown to the user.
- Actions approved.
- Actions declined or skipped.
- Actions completed.
- Actions failed, with reason.
- After disk usage.
- Recovered space.
- Residual risk.

Example summary:

```text
Before:
Disk usage: 92%

Actions approved:
- npm cache cleanup
- unused Docker layer cleanup

After:
Disk usage: 71%
Recovered: 48.3 GB
```

## Rollback Awareness

Do not promise rollback unless Rina can actually perform it.

Use honest labels:
- Regenerable: cache or derived data that can be recreated later.
- Re-downloadable: dependency or image data that can be fetched again.
- Reversible: action has a tested restore path.
- Irreversible: Rina cannot restore this automatically after deletion.

High-impact irreversible actions must require explicit typed confirmation.

## Acceptance Criteria

- No mutation happens before approval.
- All cleanup actions carry risk, expected effect, rollback awareness, and verification metadata.
- The UI exposes the current progress state during the flow.
- The final report includes before/after evidence and recovered-space delta.
- Declined actions are recorded without retrying silently.
- Failed actions are recorded with a reason and do not hide partial results.

## Demo Narrative

A developer's machine is low on disk. Rina inspects safely, explains cleanup options, asks before touching anything, cleans only what the developer approves, verifies the result, and leaves an audit trail.

The target reaction is:

> I would trust this on my machine.
