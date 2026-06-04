# Oversized Source Audit

## Goal

Identify large source files that are likely to accumulate conflicting logic.

## Current Policy

Do not refactor large files during release stabilization unless they block the product loop.

Product loop:

chat → understand → plan → execute/observe → stream → verify → Proof → memory

## Files Over 1,000 Lines

| File | Lines | Role | Risk | Action |
|---|---|---|---|---|
| website/workers/router.ts | 7931 | worker router | high | external; ignore |
| packages/rinawarp-agentd/src/server.ts | 3824 | agent daemon/server | high | audit only; split after beta |
| scripts/build/build-pages-site.mjs | 3245 | build script | medium | audit only |
| packages/rinawarp-agentd/test/server-api.test.mjs | 2376 | tests | high | preserve as test suite |
| apps/terminal-pro/src/main/rina-agent.ts | 1987 | core agent orchestration | high | audit only; preserve behavior |
| apps/terminal-pro/src/main/startup/runtimeTypes.ts | 1742 | runtime types | medium | audit only |
| apps/terminal-pro/src/main/memory/memoryStore.ts | 1553 | local memory | high | audit only; no release refactor |
| apps/terminal-pro/src/main/inline-rina.ts | 1141 | inline rina | medium | audit only |

## Warning Threshold

Source files over 1,000 lines are reported but not blocked.

## Next Review

After founder confirms Rina loop in packaged app.
