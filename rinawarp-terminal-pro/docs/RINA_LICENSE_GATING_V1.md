# Rina License Gating v1 (Locked)

This document defines capability gating by tier.
It does not change safety/behavior standards.

Runtime source of truth:
- `packages/rinawarp-core/src/enforcement/index.ts` (`LicensePolicy`)
- `packages/rinawarp-agentd/src/license.ts` (request-tier resolution)

## Tiers

- `starter`
- `creator`
- `pro`
- `pioneer`
- `founder`
- `enterprise`

## Capability Matrix

### Starter
- allow: `read`, `safe-write`, planning-only behavior
- block: all `high-impact`

### Creator
- allow: `read`, `safe-write`, planning-only behavior
- block: all `high-impact`

### Pro
- allow: `read`, `safe-write`, `deploy.prod`
- block: other `high-impact`

### Pioneer
- same as `pro` in current runtime

### Founder
- allow: all categories/tools

### Enterprise
- allow: all categories/tools

## Enforcement Order

Execution checks run in this order:
1. allowlist (`ToolRegistry`)
2. license gate (`LicensePolicy`)
3. safety contract validation
4. confirmation token validation
5. execution + verification

## Agentd License Resolution

For `/v1/execute-plan`:

- In production (`NODE_ENV=production`):
1. Require `x-rinawarp-license-token`
2. Verify signature with `RINAWARP_AGENTD_ENTITLEMENT_SECRET`
3. Derive tier from signed payload (`typ=license`, valid `tier`, non-expired `exp`)

- In non-production:
1. If entitlement token is present, verify it as above
2. Else allow `RINAWARP_AGENTD_LICENSE` env override
3. Else allow `x-rinawarp-license` only when `RINAWARP_AGENTD_ALLOW_LICENSE_HEADER=true`
4. Else fallback `starter`

Invalid token -> HTTP `401`.
Invalid configuration -> HTTP `500`.
Invalid non-production tier override -> HTTP `400`.
