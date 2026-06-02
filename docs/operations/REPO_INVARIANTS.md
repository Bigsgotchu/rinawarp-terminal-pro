# RinaWarp Repository Invariants

## 🧭 Non-Negotiable System Rules

These are not guidelines. They are **behavioral contracts** enforced by both humans and automated systems.

### 1. Node Version Lock (Node 20 LTS Only)

**Rule:** Node.js version **MUST** be 20 LTS.

**Where it's enforced:**
- `.nvmrc` → must contain exactly `20`
- All `package.json` files → `engines.node` must be `>=20.0.0`
- CI pipelines → configured to Node 20 exclusively
- Local development → `nvm use` enforces this

**Why:** Cross-environment consistency prevents "works on my machine" disasters.

### 2. Package Manager Lock (pnpm Only)

**Rule:** pnpm is the **only** package manager for this monorepo.

**Where it's enforced:**
- Root `package.json` → `preinstall` script runs `only-allow pnpm`
- Root `package.json` → `engines.pnpm` must be `>=9.0.0`
- All workspace packages → `engines.pnpm` must be `>=9.0.0`
- `.npmrc` / `.yarnrc` → prevent npm/yarn contamination
- CI pipelines → `npm install` should fail; use `pnpm install` only

**Why:** Mixed package managers cause lockfile chaos and silent dependency conflicts.

### 3. Workspace Structure Is the Dependency Boundary

**Rule:** All code lives in one of these directories:
- `apps/*` → runnable applications
- `packages/*` → reusable libraries
- `services/*` → backend services

**Where it's enforced:**
- `pnpm-workspace.yaml` → must list all three
- CI → validates workspace references are `workspace:*` (not fixed versions)
- No external `node_modules` at repo root

**Why:** Monorepo chaos prevention. Clear boundaries = clear ownership.

### 4. CI Is a Gatekeeper, Not a Notifier

**Rule:** CI failures **block** merges. No red checks. No compromises.

**Minimum CI Requirements:**
- Checkout code
- Setup Node 20
- Install with `pnpm install --frozen-lockfile`
- Run `pnpm lint`
- Run `pnpm typecheck`
- Run `pnpm build`

**Future CI enforcement gates (coming soon):**
- Detect if `npm` or `yarn` was used → FAIL
- Detect lockfile drift → FAIL
- Detect missing `engines.node` in any `package.json` → FAIL
- Detect workspace reference violations → FAIL
- Detect broken imports across workspace boundaries → FAIL

**Why:** Prevention > remediation. Bad commits never merge.

### 5. .nvmrc Is Sacred

**Rule:** `.nvmrc` at repo root is the single source of truth for Node version.

**File location:** `/root/.nvmrc`

**Content:** Must be exactly:
```
20
```

**Why:** Tools like `nvm`, `fnm`, and IDE extensions read this file to auto-switch Node versions.

### 6. All Scripts Must Be Reproducible Locally and in CI

**Rule:** If `pnpm build` works locally, it must work in CI. No environment-specific hacks.

**What this means:**
- No CI-only scripts that don't exist locally
- No "works in CI but not locally" scenarios
- All tooling must be installed via `package.json`, not system packages
- All paths must be relative or use standard conventions

**Why:** Debugging production issues requires reproducibility.

### 7. Version Lock Files Are Sacred

**Rule:** `pnpm-lock.yaml` is checked into git and **never** deleted.

**What this means:**
- Lockfile is the source of truth for exact dependency versions
- Developers run `pnpm install`, not `pnpm update`
- CI runs `pnpm install --frozen-lockfile`
- Updates happen via deliberate `pnpm update` → commit lockfile

**Why:** Prevents version chaos and makes upgrades deliberate acts, not accidents.

---

## 🧪 How Violations Are Caught

### Local (Pre-commit)
- `pnpm preinstall` rejects `npm install`
- `.nvmrc` tools auto-switch Node version
- IDE extensions flag missing `engines` fields

### CI (Automated)
- `.github/workflows/ci.yml` enforces Node 20
- CI fails on `npm` or `yarn` lockfile detection
- CI fails if workspace structure is malformed
- CI fails if `engines.node` is missing or wrong

### Human (Code Review)
- PRs that violate these rules get flagged immediately
- No exceptions without repo maintainer approval

---

## 🔧 Common Violations & Fixes

### "I ran `npm install` by accident"
```bash
# Fix: Clean up and use pnpm
rm -rf node_modules package-lock.json yarn.lock
pnpm install
```

### "My Node version is wrong"
```bash
# Fix: Use nvm/fnm to switch
nvm use 20
# or: fnm use 20
```

### "My app uses Node 18 because..."
```
❌ NOT ALLOWED
Upgrade to Node 20 LTS.
```

### "I need to add a new workspace"
```
1. Create directory under apps/, packages/, or services/
2. Add package.json with:
   - "engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" }
3. pnpm-workspace.yaml already includes apps/*, packages/*, services/*
   (no changes needed there)
4. Run: pnpm install
5. CI will validate everything on next PR
```

---

## 📊 Verification Checklist

Run this before claiming repo health:

```bash
# Check Node version
cat .nvmrc
node --version  # Should be v20.x.x

# Check pnpm
pnpm --version  # Should be 9.x.x or higher

# Verify workspace structure
pnpm list --depth=0

# Build everything
pnpm build

# Run tests & lints
pnpm lint
pnpm typecheck

# (If available) Run CI locally
# Requires github-cli or similar
```

---

## 🚀 When These Rules Are Followed

✅ Every developer can run the same commands and get identical results
✅ CI passes consistently (no flakes)
✅ Dependency updates are intentional, not accidental
✅ AI agents can safely modify code (they trust the toolchain)
✅ Production releases are reproducible
✅ Onboarding new developers is fast (they just follow the rules)

---

## 📝 Last Updated

May 24, 2026 — Layer 0 + Layer 1 Hardening Pass

---

**Questions?** Ask in code review or file an issue. These rules exist for safety, not bureaucracy.
