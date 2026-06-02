# AI Assistant Rules for RinaWarp

## Mandatory Pre-Operation Checklist

Before performing any file modifications, the AI assistant MUST:

1. [ ] Verify current working directory is the intended child repo (not parent or sibling)
2. [ ] Read and acknowledge this file (AI_ASSISTANT_RULES.md)
3. [ ] Read and acknowledge REPO_HYGIENE.md
4. [ ] Confirm no operations will touch parent directories (`/home/karina/Documents/..`)
5. [ ] Confirm no operations will touch sibling repositories
6. [ ] If planning to commit, verify working on a feature branch (not main/master)

## Absolute Prohibitions

The AI assistant MUST NEVER:

- Run `git commit`, `git push`, `git tag` without explicit human instruction
- Modify files outside the current repository workspace
- Access or modify `.git` directories in parent paths
- Publish releases, update version numbers, or modify changelogs without approval
- Touch `~/.stripe/`, `~/.config/`, or other potential secret locations within repo bounds
- Execute commands that could affect multiple repositories simultaneously

## Required Workflow

All AI-assisted work MUST follow this sequence:

1. **Analysis Phase**
   - Understand the problem/request
   - Check existing documentation and code patterns
   - Identify files that need modification

2. **Planning Phase** 
   - Create explicit implementation plan
   - List exact files to be changed
   - Describe what each change will accomplish
   - Wait for human approval of plan

3. **Implementation Phase**
   - Make only the planned changes
   - Keep modifications minimal and focused
   - Follow existing code style and patterns

4. **Verification Phase**
   - Run relevant tests (lint, build, unit tests)
   - Check for unintended side effects
   - Verify changes solve the stated problem

5. **Review Phase**
   - Show `git diff` of changes
   - Explain what was done and why
   - Wait for human approval before any commit

## Branch Naming Convention

For AI work, ALWAYS use:
```
git checkout -b ai/<description>-<ticket-or-date>
```

Examples:
- `ai/fix-login-button-20260601`
- `ai/add-api-endpoint-users`
- `ai/update-deps-security-patch`

Never work directly on `main` or `master` branches for AI-assisted changes.

## Commit Message Format

When commits are explicitly authorized, use:
```
<type>(<scope>): <short description>

<optional longer description>

<optional footer>
```

Types: feat, fix, docs, style, refactor, test, chore, ci, perf

## Emergency Stop Conditions

If any of these are detected, STOP IMMEDIATELY and request human intervention:

- Attempting to modify files outside current repo
- Git operations targeting parent directories
- Commands that could affect multiple repos
- Release/publish operations without explicit approval
- Version number modifications
- Tag creation or modification

## Verification Questions

Before ending a session, the AI should be able to answer "yes" to:

- [ ] Did I verify I'm in the correct repository?
- [ ] Did I follow the analysis→plan→implement→verify→review workflow?
- [ ] Are my changes limited to only what was explicitly requested/approved?
- [ ] Did I avoid all prohibited operations?
- [ ] Can I show exactly what files I changed and why?