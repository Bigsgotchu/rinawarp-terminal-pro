# Production Watchdog

Always-on production monitor for revenue-critical paths:

- Website routes and auth preflight
- Pages/custom-domain parity checks
- Release manifest and checksum verification
- Token mint + gated download path

## Run Once

```bash
npm run watchdog:prod:once
```

## Run Continuously

```bash
npm run watchdog:prod
```

Default interval is 300s.

## Key Environment Variables

```bash
INTERVAL_SEC=120
MAX_CONSEC_FAILS=3
TEST_CUSTOMER_ID=cus_TEST
ALERT_WEBHOOK_URL=https://your-alert-endpoint
FORCE_IPV4=1
```

## Strong Fallbacks (IP Pinning)

If DNS is unstable, pin hosts explicitly:

```bash
RESOLVE_WWW_IP=172.67.129.27
RESOLVE_API_IP=<api-ipv4>
RESOLVE_PAGES_IP=<pages-ipv4>
RESOLVE_DOWNLOADS_IP=<downloads-ipv4>
```

Then run:

```bash
RESOLVE_WWW_IP=172.67.129.27 \
RESOLVE_API_IP=<api-ipv4> \
RESOLVE_PAGES_IP=<pages-ipv4> \
RESOLVE_DOWNLOADS_IP=<downloads-ipv4> \
npm run watchdog:prod
```

## Logs and State

- Log file: `data/monitor/prod-watchdog.log`
- Failure state: `data/monitor/prod-watchdog.state`
