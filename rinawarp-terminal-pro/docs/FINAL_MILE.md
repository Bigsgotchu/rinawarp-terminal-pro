# Final Mile Gate

Run the complete production revenue gate:

```bash
npm run final:mile
```

This checks:

- Pages parity (`www` vs `pages.dev`)
- Production routes + API preflight
- Manifest/checksum audit
- Stripe API surface checks
- Revenue E2E path (token + gated download)
- Legal/trust pages (`terms`, `privacy`, `refunds`, `eula`, `pricing`, `contact`, `download`)

## Hardened Network Fallbacks

```bash
FORCE_IPV4=1 \
RESOLVE_WWW_IP=172.67.129.27 \
RESOLVE_API_IP=<api-ipv4> \
RESOLVE_PAGES_IP=<pages-ipv4> \
RESOLVE_DOWNLOADS_IP=<downloads-ipv4> \
npm run final:mile
```

## Output

Final-mile report is written to:

- `data/monitor/final-mile-<timestamp>.log`
