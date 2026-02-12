/**
 * RinaWarp Terminal Pro - Stripe Checkout Session Handler
 * 
 * Creates Stripe Checkout Sessions for pricing page purchases.
 * Only allows pre-defined price IDs (security allowlist).
 */

import Stripe from "stripe";

// Price IDs (must match env vars for tier resolution)
const PRICE_IDS = {
  // Lifetime (one-time)
  TEAM_LIFETIME: "price_1SdxmFGZrRdZy3W9skXi3jvE",     // $999
  PIONEER_LIFETIME: "price_1Sdxm2GZrRdZy3W9C5tQcWiW",  // $800
  PRO_LIFETIME: "price_1SdxlmGZrRdZy3W9ncwPfgFr",      // $699

  // Subscriptions (recurring)
  TEAM_MONTHLY: "price_1SdxlXGZrRdZy3W9Wr1XLBIe",      // $99/mo
  CREATOR_MONTHLY: "price_1SdxlKGZrRdZy3W9TvaLugc7",   // $69/mo
  PRO_MONTHLY: "price_1Sdxl7GZrRdZy3W9INQvidPf"        // $29/mo
} as const;

// Allowlist of valid price IDs for security
const ALLOWLIST = new Set<string>(Object.values(PRICE_IDS));

// Subscription price IDs for mode detection
const SUBSCRIPTION_PRICES = new Set<string>([
  PRICE_IDS.PRO_MONTHLY,
  PRICE_IDS.CREATOR_MONTHLY,
  PRICE_IDS.TEAM_MONTHLY
]);

type Env = {
  STRIPE_SECRET_KEY: string;
  CHECKOUT_SUCCESS_URL: string;
  CHECKOUT_CANCEL_URL: string;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

export async function handleCheckout(request: Request, env: Env): Promise<Response> {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return json({ ok: true });
  }

  // Only allow POST
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  // Parse request body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const price_id = String(body?.price_id || "").trim();
  const customer_email = body?.customer_email ? String(body.customer_email).trim() : undefined;

  // Validate price_id
  if (!price_id) {
    return json({ error: "price_id_required" }, 400);
  }

  if (!ALLOWLIST.has(price_id)) {
    return json({ error: "invalid_price_id" }, 400);
  }

  // Initialize Stripe
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" as any });

  // Determine mode: subscription vs one-time payment
  const mode: Stripe.Checkout.SessionCreateParams.Mode = SUBSCRIPTION_PRICES.has(price_id)
    ? "subscription"
    : "payment";

  try {
    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      success_url: env.CHECKOUT_SUCCESS_URL,
      cancel_url: env.CHECKOUT_CANCEL_URL,
      customer_email,
      metadata: {
        product: "rinawarp-terminal-pro",
        price_id,
      },
      automatic_tax: { enabled: true },
    });

    return json({ url: session.url });
  } catch (err: any) {
    console.error("Failed to create checkout session:", err.message);
    return json({ error: "checkout_failed", details: err.message }, 500);
  }
}
