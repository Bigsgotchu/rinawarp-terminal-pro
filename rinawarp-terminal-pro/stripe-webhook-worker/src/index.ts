/**
 * RinaWarp Terminal Pro - Stripe Webhook Handler
 * 
 * Features:
 * - Stripe signature verification
 * - D1 idempotency (dedupe by event_id)
 * - Entitlement write with tier detection (4-tier hierarchy)
 * - License key generation for lifetime purchases
 * - "Highest tier wins" for customers with multiple purchases
 * - Download token minting for secure downloads
 * - License verification endpoint for desktop app
 * - Checkout Session creation for pricing page
 * 
 * Price IDs (live mode):
 * - PRICE_ID_TEAM_LIFETIME: $999
 * - PRICE_ID_PIONEER_LIFETIME: $800
 * - PRICE_ID_PRO_LIFETIME: $699
 * - PRICE_ID_TEAM_MONTHLY: $99/mo
 * - PRICE_ID_CREATOR_MONTHLY: $69/mo
 * - PRICE_ID_PRO_MONTHLY: $29/mo
 */

import Stripe from "stripe";
import { handleCheckout } from "./checkout";

type Tier = "pro" | "creator" | "pioneer" | "team";

function resolveTier(env: Env, priceId: string | null): Tier | null {
  if (!priceId) return null;

  const map: Record<string, Tier> = {
    [env.PRICE_ID_TEAM_LIFETIME]: "team",
    [env.PRICE_ID_TEAM_MONTHLY]: "team",

    [env.PRICE_ID_PIONEER_LIFETIME]: "pioneer",

    [env.PRICE_ID_CREATOR_MONTHLY]: "creator",

    [env.PRICE_ID_PRO_LIFETIME]: "pro",
    [env.PRICE_ID_PRO_MONTHLY]: "pro",
  };

  return map[priceId] ?? null;
}

function tierRank(tier: Tier): number {
  switch (tier) {
    case "team": return 4;
    case "pioneer": return 3;
    case "creator": return 2;
    case "pro": return 1;
  }
}

function generateLicenseKey(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return `LIC-${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}-${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}`.toUpperCase();
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Sign a payload with HMAC-SHA256 using the secret key
 */
async function signToken(secret: string, payload: Record<string, unknown>): Promise<string> {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, payloadBytes);

  return `${b64url(payloadBytes)}.${b64url(new Uint8Array(sig))}`;
}

function b64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // License verification endpoint for the desktop app
    if (url.pathname === "/api/license/verify" && request.method === "POST") {
      if (!env.DOWNLOAD_TOKEN_SECRET) {
        return new Response("Missing DOWNLOAD_TOKEN_SECRET", { status: 500 });
      }

      let body: any;
      try {
        body = await request.json();
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }

      const customerId = typeof body.customer_id === "string" ? body.customer_id : null;
      const deviceId = typeof body.device_id === "string" ? body.device_id : null;
      const appVersion = typeof body.app_version === "string" ? body.app_version : null;

      if (!customerId) return new Response("Missing customer_id", { status: 400 });

      const ent = await env.DB.prepare(
        "SELECT tier, status FROM entitlements WHERE customer_id = ? LIMIT 1"
      ).bind(customerId).first<{ tier: Tier; status: string }>();

      if (!ent) return json({ ok: false, error: "no_entitlement" }, 403);
      if (ent.status !== "active") return json({ ok: false, error: "not_active", status: ent.status }, 403);

      // License token TTL (7 days). App can cache it and re-verify periodically.
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const licenseToken = await signToken(env.DOWNLOAD_TOKEN_SECRET, {
        typ: "license",
        customer_id: customerId,
        tier: ent.tier,
        device_id: deviceId,
        app_version: appVersion,
        exp: expiresAt,
      });

      return json({
        ok: true,
        customer_id: customerId,
        tier: ent.tier,
        status: ent.status,
        expires_at: expiresAt,
        license_token: licenseToken,
      });
    }

    // Download token minting endpoint
    if (url.pathname === "/api/download-token" && request.method === "GET") {
      const customerId = url.searchParams.get("customer_id");
      if (!customerId) return new Response("Missing customer_id", { status: 400 });

      if (!env.DOWNLOAD_TOKEN_SECRET) {
        return new Response("Missing DOWNLOAD_TOKEN_SECRET", { status: 500 });
      }

      const ent = await env.DB.prepare(
        "SELECT tier, status FROM entitlements WHERE customer_id = ? LIMIT 1"
      ).bind(customerId).first<{ tier: Tier; status: string }>();

      if (!ent) return json({ ok: false, error: "no_entitlement" }, 403);
      if (ent.status !== "active") return json({ ok: false, error: "not_active", status: ent.status }, 403);

      // Download token TTL (10 minutes)
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const token = await signToken(env.DOWNLOAD_TOKEN_SECRET, {
        typ: "download",
        customer_id: customerId,
        tier: ent.tier,
        exp: expiresAt,
      });

      return json({ token, expires_at: expiresAt, tier: ent.tier });
    }

    // Stripe Checkout Session endpoint for pricing page
    if (url.pathname === "/api/stripe/checkout" && request.method === "POST") {
      if (!env.STRIPE_SECRET_KEY) {
        return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
      }
      if (!env.CHECKOUT_SUCCESS_URL || !env.CHECKOUT_CANCEL_URL) {
        return new Response("Missing CHECKOUT_SUCCESS_URL or CHECKOUT_CANCEL_URL", { status: 500 });
      }
      return handleCheckout(request, env);
    }

    // Stripe webhook endpoint
    if (url.pathname !== "/api/stripe/webhook") {
      return new Response("Not Found", { status: 404 });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const sig = request.headers.get("stripe-signature");
    if (!sig) {
      return new Response("Missing stripe-signature", { status: 400 });
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
    }

    if (!env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
    }

    const rawBody = await request.text();

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    console.log(`Received Stripe event: ${event.type} (${event.id})`);

    // Idempotency: store event id; if already processed, return 200
    try {
      await env.DB.prepare(
        "INSERT INTO stripe_events (event_id, received_at) VALUES (?, ?)"
      )
        .bind(event.id, Date.now())
        .run();
      console.log(`Event ${event.id} stored for the first time`);
    } catch (e: any) {
      console.log(`Event ${event.id} already processed, skipping`);
      return new Response("ok", { status: 200 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerId = session.customer as string;
        const customerEmail = session.customer_details?.email || session.customer_email;
        const priceId = session.line_items?.data[0]?.price?.id || null;
        const amountPaid = session.amount_total || 0;
        const tier = resolveTier(env, priceId);

        if (!customerId || !customerEmail || !tier) {
          console.warn("Missing customer_id, email, or tier");
          return new Response("ok", { status: 200 });
        }

        // Only grant entitlement if payment was actually successful
        if (session.payment_status !== "paid") {
          console.warn(`Payment not completed for ${customerEmail}, status: ${session.payment_status}`);
          return new Response("ok", { status: 200 });
        }

        const normalizedEmail = customerEmail.toLowerCase();
        console.log(`Processing checkout: ${customerEmail}, Tier: ${tier}, Amount: $${amountPaid / 100}`);

        const isRecurring = session.mode === "subscription";

        try {
          await upsertEntitlement(env, {
            customer_id: customerId,
            tier,
            status: "active",
            customer_email: normalizedEmail,
            subscription_id: isRecurring ? (session.subscription as string) : null,
          });
          console.log(`Entitlement granted: ${normalizedEmail} (${tier})`);

          if (!isRecurring) {
            const licenseKey = generateLicenseKey();
            await env.DB.prepare(
              `INSERT OR REPLACE INTO license_keys 
              (license_key, customer_id, tier, status, max_devices, used_devices) 
              VALUES (?, ?, ?, ?, ?, ?)`
            )
              .bind(licenseKey, customerId, tier, "active", 3, 0)
              .run();
            console.log(`License key generated: ${licenseKey}`);
          }
        } catch (err: any) {
          console.error("Failed to write entitlement:", err.message);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        if (customerId) {
          const tier = resolveTier(env, subscription.items.data[0]?.price?.id || null);
          const status = subscription.status === "active" ? "active" : "suspended";

          try {
            await upsertEntitlement(env, {
              customer_id: customerId,
              tier: tier || "pro",
              status,
              customer_email: null,
              subscription_id: subscription.id,
            });
            console.log(`Subscription updated: ${customerId}, Status: ${status}`);
          } catch (err: any) {
            console.error("Failed to update subscription:", err.message);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        if (customerId) {
          try {
            await env.DB.prepare(
              "UPDATE entitlements SET status = ?, updated_at = ? WHERE customer_id = ?"
            )
              .bind("revoked", Date.now(), customerId)
              .run();
            console.log(`Subscription revoked: ${customerId}`);
          } catch (err: any) {
            console.error("Failed to revoke subscription:", err.message);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response("ok", { status: 200 });
  },
};

interface Env {
  // Price IDs for tier resolution
  PRICE_ID_TEAM_LIFETIME: string;
  PRICE_ID_PIONEER_LIFETIME: string;
  PRICE_ID_PRO_LIFETIME: string;

  PRICE_ID_TEAM_MONTHLY: string;
  PRICE_ID_CREATOR_MONTHLY: string;
  PRICE_ID_PRO_MONTHLY: string;

  // Stripe secrets
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_SECRET_KEY: string;

  // Checkout URLs for pricing page
  CHECKOUT_SUCCESS_URL: string;
  CHECKOUT_CANCEL_URL: string;

  // Token secret for HMAC signing
  DOWNLOAD_TOKEN_SECRET: string;

  // Database
  DB: D1Database;
}

async function upsertEntitlement(env: Env, row: {
  customer_id: string;
  tier: Tier;
  status: string;
  customer_email: string | null;
  subscription_id: string | null;
}) {
  const existing = await env.DB.prepare(
    "SELECT tier, status FROM entitlements WHERE customer_id = ? LIMIT 1"
  ).bind(row.customer_id).first<{ tier: Tier; status: string }>();

  const finalTier =
    existing && existing.tier
      ? (tierRank(row.tier) > tierRank(existing.tier) ? row.tier : existing.tier)
      : row.tier;

  await env.DB.prepare(
    `INSERT INTO entitlements (customer_id, tier, status, customer_email, subscription_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(customer_id) DO UPDATE SET
       tier = excluded.tier,
       status = excluded.status,
       customer_email = excluded.customer_email,
       subscription_id = excluded.subscription_id,
       updated_at = excluded.updated_at`
  )
    .bind(
      row.customer_id,
      finalTier,
      row.status,
      row.customer_email,
      row.subscription_id,
      Date.now(),
    )
    .run();
}
