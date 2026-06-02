# 🧭 LAYER 0 + LAYER 1 HARDENING COMPLETED

**Date:** May 24, 2026
**Status:** ✅ COMPLETE AND VERIFIED

---

## 📌 What Was Built

This is **not** feature work. This is installing the **keel of the ship** before adding engines, sails, or navigation systems.

The goal: **Make the system refuse invalid states.**

### 1. ✅ Toolchain Truth Lock (NON-NEGOTIABLE)

**Status: COMPLETE**

- `.nvmrc` at repo root → locked to `20` (Node 20 LTS)
- Root `package.json`:
  ```json
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
  ```
- All workspace packages (20+ in packages/, apps/, services/):
  - ✅ Have `engines.node >= 20.0.0`
  - ✅ Have `engines.pnpm >= 9.0.0` (where applicable)
  - ✅ Parity across entire monorepo

**Why:** If Node is wrong, everything downstream fails silently. We prevent that at the boundary.

---

### 2. ✅ pnpm-Only Ecosystem

**Status: COMPLETE**

Root `package.json` enforces:
```json
"scripts": {
  "preinstall": "npx only-allow pnpm"
}
```

This means:
- ❌ `npm install` → **FAILS**
- ❌ `yarn install` → **FAILS**
- ✅ `pnpm install` → Works

**Why:** npm and yarn create different lockfiles. The monorepo would immediately fracture.

---

### 3. ✅ Infra Skeleton (Intentional Geography)

**Status: COMPLETE**

Created structure for future infrastructure:
```
infra/
  ├── ci/                 # CI/CD configuration
  ├── cloudflare/         # Cloudflare deployments
  ├── posthog/            # Analytics infrastructure
  ├── sentry/             # Error tracking
  └── stripe/             # Payment processing
```

These are **empty directories with intent**. When infrastructure code comes later, it has a home.

**Why:** Infrastructure chaos happens when files scatter randomly. Assigned space prevents that.

---

### 4. ✅ CI Enforcement (MOST IMPORTANT)

**Status: COMPLETE**

Added `enforce` job to `.github/workflows/ci.yml`:

```yaml
jobs:
  enforce:
    name: Enforce Repo Invariants
    runs-on: ubuntu-latest
    steps:
      - 🚫 Reject npm/yarn contamination
      - 🔍 Validate .nvmrc (must be 20)
      - 🔍 Validate workspace structure
      - 🔍 Validate engines in all package.json
      - 🔍 Validate preinstall script
```

**This means:**
- ✅ Commits with `package-lock.json` → CI FAILS
- ✅ Commits with wrong .nvmrc → CI FAILS
- ✅ Commits with missing engines → CI FAILS
- ✅ All validation happens **before merge**

**Why:** CI is the gatekeeper. It doesn't "warn"—it **blocks**.

---

### 5. ✅ Repository Invariants Document

**Status: COMPLETE**

Created `/REPO_INVARIANTS.md` with:

- **Non-negotiable rules** for Node, pnpm, and workspace
- **Where each rule is enforced** (local, CI, human review)
- **Common violations** and how to fix them
- **Verification checklist** to run before claiming repo is healthy
- **Why these rules exist** (not bureaucracy, but safety)

This is not documentation. **It's a behavioral contract.**

---

## 🧪 Verification Passed

All smoke tests confirm the hardening is active:

```bash
✅ .nvmrc is "20"
✅ pnpm-workspace.yaml includes apps/*, packages/*, services/*
✅ Root package.json has: node >=20.0.0, pnpm >=9.0.0
✅ All 20+ workspace packages have engines fields
✅ Both apps (terminal-pro, rinawarp-companion) have engines
✅ Preinstall script enforces pnpm-only
✅ CI enforcement job validates all rules
✅ REPO_INVARIANTS.md created and comprehensive
```

---

## 📋 Files Modified

| File | Change | Reason |
|------|--------|--------|
| `/package.json` | Added `pnpm >= 9.0.0` to engines | Enforce pnpm everywhere |
| `/apps/terminal-pro/package.json` | Added `pnpm >= 9.0.0` to engines | Workspace consistency |
| `/apps/rinawarp-companion/package.json` | Added node + pnpm to engines | VSCode extension also needs Node |
| `/.github/workflows/ci.yml` | Added `enforce` job with 5 gates | CI becomes gatekeeper |
| `/REPO_INVARIANTS.md` | **CREATED NEW** | Behavioral contract |

---

## 🚦 How This Protects the System

### Before (Without Hardening)
- ❌ Developer A runs `npm install` → lockfile fractures
- ❌ Developer B uses Node 18 → subtle incompatibilities
- ❌ Someone commits Node 16 requirement → future chaos
- ❌ CI "passes" but only checks happy path
- ❌ AI agent mutates code with no guardrails

### After (With Hardening)
- ✅ `npm install` fails immediately with clear error
- ✅ `.nvmrc` auto-switches to Node 20 with `nvm use`
- ✅ Commit with wrong Node version → CI rejects
- ✅ CI enforces 5 separate validation gates
- ✅ AI agent operates within guardrails (next layer)

---

## 🎯 What This Enables Next

With this foundation in place, the next layers become possible:

### Layer 2: Rina Runtime Core (Next Steps)
- Transactions engine (atomic changes)
- Diff engine (see what changed)
- Approval gating (humans/AI approve before merge)
- AI-as-proposer model (AI suggests, humans decide)

### Layer 3: MCP Layer
- Safe AI-driven mutations
- Schema validation
- Automatic rollback on failure

### Layer 4: Runtime Safety
- Policy enforcement
- Audit logging
- Compliance tracking

**But none of this is possible without Layer 0+1 being rock solid first.**

---

## ⚙️ How to Verify It Locally

Run this checklist:

```bash
# 1. Check Node version
nvm use 20
node --version  # Should be v20.x.x

# 2. Check .nvmrc
cat .nvmrc  # Should be "20"

# 3. Check pnpm version
pnpm --version  # Should be >= 9.0.0

# 4. Verify workspace
pnpm list --depth=0

# 5. Try npm (should fail)
npm install  # Should error: "Only pnpm is allowed"

# 6. Run with pnpm (should work)
pnpm install --frozen-lockfile

# 7. Read the contract
cat REPO_INVARIANTS.md
```

---

## 🔒 Critical Rules (Never Break These)

1. **Node 20 LTS only** — Never downgrade, never use other versions
2. **pnpm is the only package manager** — npm/yarn will break the monorepo
3. **Frozen lockfile in CI** — `pnpm install --frozen-lockfile` (no upgrades in CI)
4. **All packages must have engines constraints** — Future-proof dependency specification
5. **CI failures block merges** — No red checks. Ever.
6. **REPO_INVARIANTS.md is the source of truth** — When in doubt, read it

---

## 📝 Summary

| Category | Status | Evidence |
|----------|--------|----------|
| Node version lock | ✅ Complete | .nvmrc=20, engines.node>=20 everywhere |
| pnpm enforcement | ✅ Complete | preinstall script, engines.pnpm everywhere |
| Workspace structure | ✅ Complete | pnpm-workspace.yaml validated, infra/ created |
| CI enforcement | ✅ Complete | New enforce job with 5 validation gates |
| Documentation | ✅ Complete | REPO_INVARIANTS.md created |
| Smoke tests | ✅ Complete | All validation checks pass |

---

## 🚀 Next Action

After this hardening stabilizes (1-2 weeks of clean builds), proceed to:

**C — Rina Runtime Core**

Where transactions, diffs, and approval gating become real.

---

**Built by:** GitHub Copilot
**Model:** Claude Haiku 4.5
**Purpose:** Foundation for trustworthy AI-driven development platform
