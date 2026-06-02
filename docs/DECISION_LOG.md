# Decision Log for RinaWarp

## ADR-001: Runtime Owns Truth

**Title:** Runtime Owns Truth

**Decision:** Execution state is owned by the runtime system, not by UI or chat sessions.

**Reason:** Prevents UI drift and ensures consistency between what the user sees and what the system actually executes. Chat sessions are transient and should not be relied upon for persistent state.

**Date:** 2026-06-01

**Status:** Accepted

**Consequences:**
- UI components must synchronize with runtime state
- Chat interfaces are view-only for execution state
- Recovery procedures can rebuild UI state from runtime
- AI assistants must not assume chat history represents current system state

## ADR-002: Repository Isolation

**Title:** Repository Boundaries for AI Agent Safety

**Decision:** AI assistants must operate within strict repository boundaries to prevent cross-contamination between projects.

**Reason:** Accidental parent Git repositories (like /home/karina/Documents) create significant risk of AI agents unintentionally modifying multiple repositories.

**Date:** 2026-06-01

**Status:** Accepted

**Consequences:**
- AI assistants must verify working directory before operations
- Parent directory Git operations are prohibited
- Workspace isolation is required (one AI window = one repo)
- Repository guardrails must be documented and followed
- Feature branches required for all AI-assisted work

## ADR-003: Canonical Repository Selection

**Title:** Selection of rinawarp-production as Canonical Repository

**Decision:** The rinawarp-production repository is designated as the canonical engineering repository for the RinaWarp Terminal Pro product.

**Reason:** This repository contains the complete monorepo structure including:
- Terminal Pro application (primary product)
- All core packages (rina-core, rina-doctor, rina-mcp, etc.)
- Services and apps
- Release infrastructure
- Complete development toolchain

**Date:** 2026-06-01

**Status:** Accepted

**Consequences:**
- All primary development occurs in rinawarp-production
- Sister repositories (website, terminals, etc.) have defined relationships
- AI assistants must confirm they are operating in the correct repository
- Release processes are centralized in this repository

## ADR-004: AI Workflow Requirements

**Title:** Mandatory AI-Assisted Development Workflow

**Decision:** All AI-assisted work must follow a strict analysis→plan→implement→verify→review workflow with human approval gates.

**Reason:** Prevents unauthorized or incorrect modifications by ensuring human oversight at critical junctures.

**Date:** 2026-06-01

**Status:** Accepted

**Consequences:**
- AI must produce explicit implementation plans before coding
- Human approval required before implementation begins
- Changes must be reviewed via git diff before committing
- Testing must be performed as part of verification phase
- Commit messages must follow conventional format when authorized