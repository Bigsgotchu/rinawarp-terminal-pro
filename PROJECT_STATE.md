# Project State

## 2026-06-09 Product Narrative Alignment

RinaWarp Terminal Pro product copy now aligns with `docs/PRODUCT_LOCK.md` and `docs/PRODUCT_UI_LOCK.md`.

Current positioning:

- Product: RinaWarp Terminal Pro
- AI: Rina
- Primary UX: Agent Thread
- Container: Agent Shell
- Runtime: AgentRuntime
- Moat: proof-backed execution
- Internal/export artifact: receipt

The product narrative is Electron + Vite + IPC + AgentRuntime + structured runs + user-visible Proof + local SQLite/memory. It must not be described as Convex, `useStream`, a deployed backend, a web dashboard, or a panel/workbench product.

Changed in this pass:

- Root README now describes Terminal Pro through Agent Thread, Agent Shell, AgentRuntime, and Proof.
- Product vision now centers `ask -> observe -> plan -> execute -> verify -> proof -> remember`.
- Architecture README now describes the real Electron/IPC/AgentRuntime/Proof/local-memory architecture.
- Receipt language is kept behind the Proof layer as an internal/export artifact.

Remaining rule:

- Use Proof as the primary user-facing term.
- Use receipt only for runtime/internal/export artifacts.
- Preserve Agent Thread as the center of the product.

## 2026-06-09 Obsolete Stack Cleanup Audit

Removal report:

- `docs/audits/TERMINAL_PRO_REMOVAL_REPORT_2026-06-09.md`

High-confidence generated/local artifacts removed and left removed in this pass:

- `apps/terminal-pro/test-results/`
- `apps/terminal-pro/.native-cache/`
- `apps/rinawarp-companion/dist/`
- `packages/rinawarp-agentd/dist/`
- `services/rina-cloud-api/dist/`
- `website/.pages-dist/`
- `test-results/`

Generated artifacts deleted during cleanup but recreated for validation:

- `apps/terminal-pro/dist-renderer/`
- `apps/terminal-pro/dist-electron/`
- Terminal Pro dependency package `dist/` outputs required by the current TypeScript/package export contract

No product/runtime source stacks were deleted in this pass.

Remaining medium-confidence removal candidates are TODO only:

- `packages/rinawarp-dashboard/`
- `services/rina-cloud-api/`
- `packages/rinawarp-api-client/`
- website Worker/API/Matter Intelligence backend routes
- `apps/rinawarp-companion/`
- marketplace/plugin/deploy expansion surfaces
- workbench-era planning docs and guard contract text

Remaining low-confidence candidates are TODO only:

- panel-heavy renderer/settings surfaces
- legacy smoke-only shell path
- duplicate-looking planner/runtime paths
- receipt compatibility modules behind the Proof layer
- dependency cleanup after code ownership is settled

Validation note:

- `apps/terminal-pro/package.json` now includes `typecheck`, using the same Terminal Pro TypeScript project build entrypoint as `build:electron`: `tsc -b tsconfig.json --pretty false`.
- `npm --workspace apps/terminal-pro run build:electron` passes after regenerating required workspace package outputs.
- `packages/rinawarp-agentd` still has unrelated standalone build issues around missing tool subpath declarations and undeclared/missing `openai`, `express`, and `ws` dependencies.

Required generated package `dist/` outputs for Terminal Pro:

- `packages/rina-contracts/dist/`
- `packages/rina-core/dist/`
- `packages/rina-runtime/dist/`
- `packages/rinawarp-agent/dist/`
- `packages/rinawarp-context/dist/`
- `packages/rinawarp-core/dist/`
- `packages/rinawarp-safety/dist/`
- `packages/rinawarp-tools/dist/`
- `packages/rina-doctor/dist/`
- `packages/runtime-core/dist/`
- `packages/runtime-contracts/dist/`
- `packages/runtime-feature-agentd/dist/`
- `packages/runtime-feature-diagnostics/dist/`
- `packages/runtime-feature-licensing/dist/`
- `packages/runtime-feature-team/dist/`
- `packages/runtime-feature-workspace/dist/`
- `packages/runtime-platform-electron/dist/`

Regenerate required package outputs with:

- `npm --workspace packages/rina-contracts run build`
- `npm --workspace packages/rina-core run build`
- `npm --workspace packages/rina-runtime run build`
- `npm --workspace packages/rinawarp-agent run build`
- `npm --workspace packages/rinawarp-context run build`
- `npm --workspace packages/rinawarp-core run build`
- `npm --workspace packages/rinawarp-safety run build`
- `npm --workspace packages/rinawarp-tools run build`
- `npm --workspace packages/rina-doctor run build`
- `npm --workspace packages/runtime-core run build`
- `npm --workspace packages/runtime-contracts run build`
- `npm --workspace packages/runtime-feature-agentd run build`
- `npm --workspace packages/runtime-feature-diagnostics run build`
- `npm --workspace packages/runtime-feature-licensing run build`
- `npm --workspace packages/runtime-feature-team run build`
- `npm --workspace packages/runtime-feature-workspace run build`
- `npm --workspace packages/runtime-platform-electron run build`

Do not delete those package `dist/` folders blindly. Terminal Pro currently imports package exports that resolve to `dist` files, and some source imports reference `packages/*/dist/index.js` directly. They can be removed permanently only after the monorepo is converted to source-based workspace imports or project-reference paths that do not require generated package output.
