# Rina Cloud API deployment

`v1.4.3-beta` makes the Rina Cloud API production-deployable with real environment variables, health checks, Stripe billing, subscription-gated cloud AI, CORS, and structured logs.

## Required production environment

Set these in the hosting provider. Do not bundle them into the desktop app.

- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PRO`
- `RINA_AUTH_SECRET`
- `RINA_CLOUD_PUBLIC_BASE_URL`
- `RINA_ALLOWED_ORIGINS`

Optional:

- `PORT`
- `RINA_OPENAI_MODEL`
- `RINA_CLOUD_ACCOUNT_STORE_FILE`
- `STRIPE_CHECKOUT_SUCCESS_URL`
- `STRIPE_CHECKOUT_CANCEL_URL`
- `STRIPE_PORTAL_RETURN_URL`

## Build and start

```bash
npm --workspace @rinawarp/rina-cloud-api run build
NODE_ENV=production npm --workspace @rinawarp/rina-cloud-api run start
```

Startup fails in production if any required variable is missing.

## Health checks

- `GET /v1/health`
  - Basic service status, version, and environment.
- `GET /v1/health/deep`
  - Provider, Stripe, and CORS configuration booleans.
  - Never returns secret values.

## Stripe webhook

Configure Stripe to send webhooks to:

```text
https://api.rinawarptech.com/v1/billing/webhook
```

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Set the webhook signing secret as `STRIPE_WEBHOOK_SECRET`.

## Desktop production config

Desktop builds should point at production with:

```bash
RINA_CLOUD_API_BASE=https://api.rinawarptech.com
```

The desktop stores only a Rina auth token. Provider and Stripe keys stay server-side.

## End-to-end paid-user smoke path

1. Start the API with production env vars.
2. Sign in from desktop with a Rina auth token.
3. Click **Upgrade** in Settings > Billing.
4. Complete Stripe Checkout.
5. Confirm Stripe posts to `/v1/billing/webhook`.
6. Refresh Settings > Billing and confirm Cloud status is `connected`.
7. Ask a cloud-backed question and confirm `/v1/agent/chat` returns `200`.

Expected blocked states:

- Unpaid users receive `402 subscription_required`.
- Over-limit users receive `429 daily_usage_limit_reached`.
