# Revenue Runbook

Run this before and after every production deploy.

## 1) End-to-End Revenue Smoke

```bash
npm run e2e:revenue
```

What it verifies:

- Core funnel pages return `200`
- Active release manifest exists
- Checksum file matches active release artifact names
- API auth preflight works
- Download token can be minted
- Tokened installer request returns `200` with correct filename

## 2) KPI Snapshot

```bash
npm run kpi:snapshot
```

Writes a live health snapshot to stdout:

- Core route availability ratio
- Build fingerprint
- Release version detected from `/download`
- Release manifest HTTP status
- Verify checksums HTTP status
- API preflight HTTP status
- Token mint success
- Gated download HTTP status

Optional file output:

```bash
OUT=./kpi-latest.json npm run kpi:snapshot
```

## 3) Seed/Test Customer

Default test customer is `cus_TEST`.
If needed, seed/refresh entitlement in remote D1:

```bash
cd downloads-worker
npx wrangler d1 execute rinawarp-prod --remote --command \
"INSERT OR REPLACE INTO entitlements (customer_id, tier, status, customer_email, subscription_id, updated_at) VALUES ('cus_TEST','team','active','test@rinawarptech.com',NULL,strftime('%s','now')*1000);"
```

## 4) Failure Policy

- If `e2e:revenue` fails, do not deploy new features.
- Fix routing/payment/download flow first, then re-run.
