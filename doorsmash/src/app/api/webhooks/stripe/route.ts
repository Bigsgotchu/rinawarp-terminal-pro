/**
 * doorsmash - Elite Dating Platform
 * Stripe webhook handler
 * Copyright (c) 2024 rinawarp Technologies, LLC
 * All rights reserved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { handleStripeWebhook } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    // Process the webhook
    const result = await handleStripeWebhook(body, signature);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Stripe webhook error:', error);

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}
