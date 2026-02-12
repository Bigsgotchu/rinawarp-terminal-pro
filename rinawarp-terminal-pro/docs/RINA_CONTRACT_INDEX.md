# Rina v1 Contract Index

This is the canonical map of product/agent contracts.
To avoid duplication drift, new contract docs should be added here instead of creating parallel variants.

## Authoritative Files

- Product definition and execution philosophy:
  - `docs/RINA_PRODUCT_CONTRACT.md`
- Safety model and invariants:
  - `docs/RINA_SAFETY_MODEL.md`
- Personality, tone, and adaptation rules:
  - `docs/RINA_PERSONALITY_CONTRACT.md`
- Tool allowlist and category contract:
  - `docs/RINA_TOOL_REGISTRY_V1.md`
- License tier gating contract:
  - `docs/RINA_LICENSE_GATING_V1.md`
- Deterministic workflow playbooks:
  - `docs/RINA_PLAYBOOKS.md`
- Delivery sequencing:
  - `docs/RINA_90_DAY_PLAN.md`
- Formal product acceptance criteria:
  - `docs/PRODUCT_SPEC_V1.md`
- Formal safety enforcement criteria:
  - `docs/SAFETY_SPEC_V1.md`
- Execution backlog for v1 delivery:
  - `docs/IMPLEMENTATION_BACKLOG_V1.md`
- This canonical index:
  - `docs/RINA_CONTRACT_INDEX.md`

## Implementation Anchors

- Core enforcement: `packages/rinawarp-core/src/enforcement/index.ts`
- Tool registry: `packages/rinawarp-core/src/tools/registry.ts`
- Agent boundary validation: `packages/rinawarp-agentd/src/server.ts`
- Agent license resolution: `packages/rinawarp-agentd/src/license.ts`
- Never-do regression tests: `packages/rinawarp-core/test/never-do.test.ts`
