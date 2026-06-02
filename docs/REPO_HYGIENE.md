# Repo Hygiene

## Core Principle
Child repos are the safe units of work. Never work from a parent directory that contains multiple projects.

## Critical Warning
`/home/karina/Documents` appears to be an accidental parent Git repo.

**Do not run in `/home/karina/Documents`:**
- git stash
- git clean
- git reset
- git commit
- Any git commands that could affect multiple repos

**Reason:**
The parent repo tracks or sees nested project folders and could capture/remove unrelated projects.

## AI Agent Safety Rules

### Workspace Isolation
- One AI Window = One Repo
- Never open parent directories (like ~/Documents) in AI agents
- Limit workspace scope to only the current repository
- AI agents can accidentally search, reference, modify, or commit to sibling repos if they can see them

### Repository Guardrails
**Never (without explicit human approval):**
- Commit automatically
- Push automatically
- Publish automatically
- Modify release tags
- Touch parent repositories
- Touch sibling repositories
- Modify files outside the current repo

### Workflow Requirements
- **Planning Phase Required:** Before coding, AI must:
  1. Analyze the problem
  2. Produce an implementation plan
  3. Wait for human approval
  4. Then modify code
- **Human Review Gate:** AI edits → git diff review → tests → human approval → commit
- **Feature Branches:** Always use feature branches for AI work (e.g., `git checkout -b ai/feature-name`)
- **Secrets Management:** Keep local secrets outside repos (use `~/.config/rinawarp/` or `~/.local/share/rinawarp/` instead of `.stripe/`, `.config/`, `secrets.json` in repo root)

### Safe Working Repos (Children of /home/karina/Documents):
- /home/karina/Documents/rinawarp-production
- /home/karina/Documents/rinawarp-terminal-pro-clean
- /home/karina/Documents/rinawarp-terminal-pro-v150-archive
- /home/karina/Documents/rinawarptech-website
- /home/karina/Documents/AgentWorkbench
- /home/karina/Documents/rinawarp-terminal-pro-v143
- /home/karina/Documents/rinawarp-website

### Future Cleanup
Only archive/remove `/home/karina/Documents/.git` after explicit human approval.
Do not modify `/home/karina/Documents/.git` now.

## Philosophical Foundation
- Runtime owns truth
- Repo owns memory  
- Chats own neither
- Chats are temporary
- Docs are permanent
- Git is authoritative
- Releases are recorded
- AI sessions can come and go without losing project control

## Next Safe Step
Continue release work only inside the intended child repo.