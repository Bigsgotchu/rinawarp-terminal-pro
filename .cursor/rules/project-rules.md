Do not create new markdown files in repository root.

Allowed root docs (only these 6 files permitted in docs/):
- PRODUCT_VISION.md
- AGENT_ARCHITECTURE.md
- THREAD_BLOCK_CONTRACT.md
- CURRENT_RELEASE_STATUS.md
- NEXT_RELEASE_PLAN.md
- DECISION_LOG.md

All other documentation must be placed inside an appropriate docs subdirectory:
- docs/canonical/ - architecture, agents, core specifications
- docs/business/ - company, GTM, revenue, strategy docs
- docs/releases/ - release notes, handoffs, signoffs
- docs/checklists/ - all checklists and QA documents
- docs/audits/ - audit reports, inventories, cleaning audits
- docs/planning/ - plans, specs, strategies, gap maps, requirements
- docs/archive/ - legacy, obsolete, historical documents
- docs/operations/ - repo hygiene, invariants, operational docs

Workflow:
1. Question → Discussion → No file created
2. Accepted idea → Discussion → Implementation plan → Human approval → Code change
3. Permanent decision → Decision → DECISION_LOG.md
4. Release → Release → CURRENT_RELEASE_STATUS.md → docs/releases/vX.Y.Z.md

AI sessions should:
- Use feature branches: git checkout -b ai/<feature-name>
- Never commit directly to main
- Follow analysis→plan→implement→verify→review workflow
