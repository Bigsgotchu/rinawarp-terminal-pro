# RinaWarp Companion vs Terminal Pro: Chat Parity Analysis

Date: 2026-03-29

## Executive Summary

The original comparison overstated the gap between RinaWarp Companion and Terminal Pro.

Companion already includes a chat surface in the repo:

- a dedicated `Chat` activity view
- a webview-based message UI
- local conversation state
- authenticated chat requests to `POST /api/vscode/chat`
- minimal workspace-context passing
- telemetry for prompt, response, action-click, and clear events

What Companion does not yet appear to have is full Terminal Pro parity around proof-backed execution, inline run receipts, recovery flows, and trust-heavy agent orchestration. The parity problem is not "build chat from scratch." The parity problem is "upgrade an existing chat scaffold into a proof-first workflow surface."

## Current Repo Reality

### Companion

Companion is a VS Code extension, not a terminal emulator proxy.

Evidence:

- package metadata and views are defined in [apps/rinawarp-companion/package.json](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/package.json)
- chat is documented in [apps/rinawarp-companion/README.md](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/README.md)
- the extension registers a `rinawarp.chat` webview provider in [apps/rinawarp-companion/src/extension.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/extension.ts)

Companion already supports:

- account linking and entitlement refresh
- a Companion sidebar
- a Chat view
- free diagnostic workflow
- pack deep links
- local workspace summarization
- structured chat actions that route back into trusted VS Code commands

Chat-specific implementation already exists in:

- [apps/rinawarp-companion/src/chat.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/chat.ts)
- [apps/rinawarp-companion/src/chatApi.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/chatApi.ts)
- [apps/rinawarp-companion/src/workspaceContext.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/workspaceContext.ts)
- [apps/rinawarp-companion/telemetry.json](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/telemetry.json)

### Terminal Pro

Terminal Pro remains the richer product for trust-sensitive execution.

From the repo, Terminal Pro clearly has:

- a dedicated Agent thread
- proof-backed run blocks
- diagnostics and recovery surfaces
- run receipts and structured runs
- conversation routing with proof-aware responses
- broader Electron E2E coverage around proof and recovery

Relevant implementation lives across:

- [apps/terminal-pro/src/main/orchestration/conversationRouter.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/orchestration/conversationRouter.ts)
- [apps/terminal-pro/src/main/orchestration/conversationResponder.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/orchestration/conversationResponder.ts)
- [apps/terminal-pro/src/main/runs/structuredRuns.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/runs/structuredRuns.ts)
- [apps/terminal-pro/tests/e2e/agent-runproof.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/agent-runproof.spec.ts)
- [apps/terminal-pro/tests/e2e/rina-conversation-resilience.spec.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/tests/e2e/rina-conversation-resilience.spec.ts)

## Corrected Comparison

| Dimension | Companion | Terminal Pro | Repo-grounded reading |
|---|---|---|---|
| Chat UI | Yes | Yes | Companion already has a `Chat` view; Terminal Pro has the Agent thread |
| Multi-turn state | Yes | Yes | Companion stores recent chat in `SecretStorage`; Terminal Pro maintains thread/runs state |
| Workspace context in chat | Yes, limited | Yes, richer | Companion sends summarized workspace context; Terminal Pro operates closer to live run state |
| Structured actions from chat | Yes | Yes | Companion maps replies to VS Code commands; Terminal Pro maps to richer proof/execution flows |
| Proof-backed execution | Limited | Strong | This is the biggest parity gap |
| Inline receipts / run blocks | No clear evidence | Yes | Terminal Pro has explicit run-block and receipt coverage |
| Recovery / interrupted-run UX | No clear evidence | Yes | Terminal Pro has recovery-specific tests and models |
| Trusted execution boundary | Moderate | Strong | Companion is more advisory; Terminal Pro is more execution-oriented |
| Entitlements / upgrade loop | Yes | Yes | Both have monetization hooks, but Companion’s are especially explicit |
| Team / audit controls | Not obvious in repo | Present in product direction | Companion looks single-user today |

## What Companion Already Has

Companion already implements most of the "chat MVP" surface that the original write-up treated as missing:

1. Chat view registration
   In [apps/rinawarp-companion/package.json](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/package.json), `rinawarp.chat` is registered as a view.

2. Chat UI and state
   In [apps/rinawarp-companion/src/chat.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/chat.ts), the extension renders a webview chat UI, persists messages, supports clear/send/action events, and offers starter prompts.

3. Authenticated backend chat
   In [apps/rinawarp-companion/src/chatApi.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/chatApi.ts), Companion sends authenticated requests to `/api/vscode/chat`.

4. Workspace-aware local answers
   In [apps/rinawarp-companion/src/workspaceContext.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/workspaceContext.ts), Companion can answer many questions locally using project structure, scripts, dependencies, git state, and recommended-pack heuristics.

5. Telemetry hooks
   In [apps/rinawarp-companion/telemetry.json](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/telemetry.json), chat events are already defined.

## Actual Parity Gaps

The real gap is not chat presence. It is workflow depth.

### Gap 1: Proof-backed execution

Terminal Pro can show evidence-rich run output and run-aware follow-up behavior. Companion chat currently appears centered on:

- advisory responses
- local workspace summaries
- pack recommendations
- command handoff into existing extension actions

Companion does not yet appear to expose:

- live run blocks
- proof receipts attached to turns
- run outcome inspection inside the chat surface
- interrupted-run recovery flows

### Gap 2: Trust UX

Terminal Pro is explicitly built around "proof before claim." Companion’s chat can already be helpful, but it is still a lighter advisory layer. To reach parity, Companion needs clearer trust states such as:

- "local answer"
- "website model answer"
- "diagnostic-backed answer"
- "workspace proof pending"

### Gap 3: Action depth

Companion actions currently route to:

- open a file
- run a free diagnostic
- open a pack
- upgrade / refresh

That is useful, but still narrower than Terminal Pro’s execution model.

### Gap 4: Conversation-to-workflow continuity

Terminal Pro has stronger continuity between:

- user ask
- plan
- run
- receipt
- recovery

Companion has chat-plus-actions, but not yet the same end-to-end continuity.

## Revised MVP Plan

The right MVP is not "add chat."

The right MVP is "upgrade existing Companion chat into a proof-first workflow assistant."

### Phase 1: Harden current chat

Scope:

- verify the `rinawarp.chat` surface is fully wired and shipped
- add tests for message sending, local answers, API answers, and action buttons
- confirm telemetry only records minimal non-sensitive fields
- validate auth-expired, offline, and rate-limit UX

Effort: Medium

### Phase 2: Add proof states to chat

Scope:

- distinguish local answer vs remote model answer in the UI
- surface the latest diagnostic result inline in chat
- add "why this answer is trustworthy" metadata for certain responses
- let chat reference the last diagnostic summary as proof context

Effort: Medium

### Phase 3: Add workflow continuity

Scope:

- let a chat turn create a diagnostic run card
- attach result summaries back into the conversation
- preserve the relationship between the user’s question and the resulting workflow
- add stronger recovery prompts after failed diagnostics

Effort: High

### Phase 4: Add richer execution handoff

Scope:

- add safe execution intents beyond free diagnostic
- let chat route into more packs with clearer preflight reasoning
- add explicit approval language for higher-risk workflows

Effort: High

## Suggested Technical Plan

### UI

Keep the current webview approach in [apps/rinawarp-companion/src/chat.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/chat.ts), but add:

- response badges: `Local`, `Model`, `Diagnostic-backed`
- richer structured action cards
- compact proof summaries inline
- stronger empty, loading, and failure states

### API Contract

The current contract already exists in [apps/rinawarp-companion/src/chatApi.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/chatApi.ts). Extend it rather than replace it.

Recommended additions:

```json
{
  "message": "string",
  "mode": "local|model|diagnostic_backed",
  "proof": {
    "kind": "diagnostic|workspace|none",
    "summary": "string"
  },
  "actions": [
    {
      "command": "string",
      "label": "string",
      "args": []
    }
  ]
}
```

### Context Passing

Build on the existing `gatherWorkspaceContext()` path instead of inventing a new context layer. The current implementation already captures:

- workspace name
- top-level entries
- package manager hint
- package scripts
- dependency names
- git status summary
- light file summaries

That is enough for a strong advisory MVP.

### Telemetry

Keep the current minimal shape and avoid prompt-body logging.

Recommended metrics:

- prompt sent
- response mode
- action clicked
- diagnostic started from chat
- diagnostic completed from chat
- upgrade clicked from chat

## Risks

### High

- Remote model/data handling is still sensitive because Companion sends prompts plus derived workspace context to a website endpoint.
- Proof language could overstate certainty if the UI does not clearly distinguish local heuristic answers from verified workflow output.

### Medium

- Webview chat can become cluttered if too many actions and proof details are rendered at once.
- The current split between local answers and remote answers may feel inconsistent unless surfaced clearly.

### Low

- The core scaffolding risk is low because the chat foundation already exists.

## Go-to-Market Implication

The monetization story should also be revised.

Companion already appears positioned as a conversion surface:

- connect account
- run free diagnostic
- ask questions in chat
- open packs
- hit a Pro boundary
- upgrade

That means GTM should not pitch "new chat is coming" unless the shipped extension still hides it. A more accurate message is:

"Companion already helps users understand their workspace and recommended next steps; the next evolution is proof-backed workflow continuity."

### Recommended GTM focus

1. Drive first-value through free diagnostic plus chat follow-up.
2. Use chat to explain why a pack is recommended.
3. Gate higher-value workflow depth, not basic conversation.
4. Measure conversion from:
   - connect account
   - first chat prompt
   - first diagnostic
   - pack open
   - upgrade click

## Immediate Product Recommendations

1. Treat Companion as an existing chat product, not a blank slate.
2. Prioritize proof-backed continuity over inventing a second chat architecture.
3. Add explicit tests for Companion chat before expanding scope.
4. Align marketing copy with the shipped product surface.
5. Keep Terminal Pro positioned as the deeper execution-and-recovery product until Companion closes the proof gap.

## Bottom Line

Companion already has chat.

Terminal Pro still has the stronger proof-backed agent experience.

The real parity project is:

"Make Companion chat more trustworthy, workflow-aware, and proof-linked,"

not:

"Add a chat box to Companion."
