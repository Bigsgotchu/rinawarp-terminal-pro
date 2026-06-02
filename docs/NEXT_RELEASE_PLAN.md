# Next Release Plan

Current next milestone:
v1.8.2-beta Real Workflow Expansion

Scope:
- add real user workflows:
  * disk diagnostics and recovery guidance
  * port diagnostics and recovery guidance
  * safe patch approval workflow
  * safe patch denial workflow
  * dangerous prompt refusal workflow
  * receipt export functionality
  * validate Agent Thread persistence and reload behavior
- expand proof blocks (runtime verification)
- improve receipt readability/export
- improve runtime error recovery
- add workflow smoke tests for each workflow

Constraints:
- no cloud memory
- no embeddings/ranking
- no duplicate thread systems
- no UI-owned execution state
- no mutation without approval
- no public release unless explicitly instructed

Acceptance tests:
- runtime tests pass (npm --workspace apps/terminal-pro run test:rina-runtime)
- trust tests pass (npm --workspace packages/rina-doctor run test:trust)
- build passes (corepack pnpm build)
- desktop dist passes (corepack pnpm dist:desktop)
- Agent Thread persistence/reload tests pass
- receipt-mandatory tests pass
- approval-denial-no-mutation tests pass
- real workflow smoke tests pass
