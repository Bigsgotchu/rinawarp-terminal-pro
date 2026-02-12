# Rina Tool Registry v1 (Authoritative)

This document is the v1 tool allowlist contract.
If a tool is not listed here, it is not executable in v1.

Runtime source of truth:
- `packages/rinawarp-core/src/tools/registry.ts`
- `packages/rinawarp-core/src/enforcement/index.ts`

## Categories

- `read`
- `safe-write`
- `high-impact`
- `planning` (reserved in type system; no concrete v1 tool implementations yet)

## Registered Tools (Current v1 Runtime)

### Read
- `file.read`
- `file.exists`
- `file.list`
- `git.status`
- `git.log`
- `doctor.sensors`
- `doctor.df`
- `doctor.uptime`
- `doctor.ps`
- `doctor.free`

### Safe-Write
- `terminal.write`
- `file.write`
- `git.stage`
- `git.commit` (requires confirmation flag at tool level)

### High-Impact
- `file.delete`
- `deploy.prod`
- `docker.prune`

## Enforcement Guarantees

All tool execution is blocked unless:
1. tool exists in registry allowlist
2. license allows tool category/name
3. safety contract fields exist per step:
   - `risk_level`
   - `requires_confirmation`
   - `verification_plan`
4. confirmation token is valid when required

## Compatibility Note

Earlier naming drafts referenced `fs.*` and `process.*`.
Current runtime implementation uses `file.*`, `terminal.write`, and `deploy.prod`.
Any rename/migration should be versioned and tested before changing this file.

