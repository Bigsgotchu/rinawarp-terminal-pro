# RinaWarp Startup Checklist

Before doing any work, confirm you are in the canonical repo.

## Canonical Repository

```bash
cd /home/karina/rinawarp-terminal-pro
pwd
git remote -v
git branch --show-current
git status --short
node -p "require('./apps/terminal-pro/package.json').version"

Expected:

/home/karina/rinawarp-terminal-pro
origin git@github.com:Bigsgotchu/rinawarp-terminal-pro.git
main
1.8.2-beta
```

If Anything Looks Wrong

Stop.

Do not code.
Do not commit.
Do not deploy.

## Read Current State First

Before coding, read in order:

1. docs/CURRENT_STATE.md
2. docs/PRODUCT_LOCK.md
3. docs/PRODUCT_UI_LOCK.md

Ignore archived historical docs unless intentionally doing research.

## If Anything Looks Wrong

Stop.

Do not code.
Do not commit.
Do not deploy.

Before Coding

git fetch origin
git status --short
git log --oneline -3
npm run founder:clean-local

Product Locks

Before changing UI, runtime, website copy, marketplace, memory, proof, billing, or release surfaces, read:

docs/PRODUCT_LOCK.md
docs/PRODUCT_UI_LOCK.md

RinaWarp Terminal Pro is the product.
Rina is the AI copilot.
Agent Shell is only the Electron desktop container.
Agent Thread is the primary user experience.

The main app must stay dark, compact, proof-backed, and Agent Thread first.
Do not call the product a workbench.

Before Committing

npm run founder:clean-local
git status --short
git diff --stat

Commit only source, docs, tests, guards, migrations, and package scripts.

Do not commit generated artifacts, downloaded installers, secrets, test results, editor state, or production data.

Before Deploying

npm run smoke:pages
npm run smoke:prod

Production State

Production secrets, D1 rows, Cloudflare deploys, SendGrid keys, and Stripe secrets are not committed to Git.

Record their existence in:

docs/PRODUCTION_STATE.md

Do not record secret values.

Commit it:

```bash
git add docs/STARTUP_CHECKLIST.md
git commit -m "docs: add startup checklist for canonical repo"
git push origin main
```

Optional shell alias

Add this to ~/.bashrc or ~/.zshrc:

alias rw='cd /home/karina/rinawarp-terminal-pro && pwd && git status --short && node -p "require(\"./apps/terminal-pro/package.json\").version"'

Then reload:

source ~/.bashrc

Use:

rw

before every Cursor session.

Next action after this

Once the startup checklist is pushed, return to Gate 15 finalization:

1. Apply production D1 migrations.
2. Set SENDGRID_API_KEY.
3. Set BETA_ADMIN_TOKEN.
4. Deploy Worker.
5. Wire live /beta and /beta-feedback forms.
6. Curl-test endpoints.
7. Run smoke checks.

But first, lock the workflow so you stop losing time to duplicate folders and local-vs-Git confusion.
