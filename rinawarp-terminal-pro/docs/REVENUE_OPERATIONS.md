# Revenue Operations

## 1) Ensure Funnel Table Exists

```bash
npm run migrate:funnel-events
```

## 2) Daily Conversion Report

```bash
npm run report:revenue-daily
```

Writes a markdown report under:

- `data/monitor/revenue-report-<timestamp>.md`

## 3) Stripe Success Audit

```bash
npm run audit:stripe-success
```

Audits:

- Webhook endpoint behavior
- Recent webhook event volume in D1
- Recent entitlement updates
- Latest entitlement rows

## Recommended Daily Cadence

1. `npm run report:revenue-daily`
2. `npm run audit:stripe-success`
3. `npm run final:mile` (if making pricing/deployment changes)
