/**
 * RinaWarp Marketplace API - Purchase Handler
 * 
 * Handles Stripe checkout for paid agents
 */

const AGENTS_KEY = "agents";

async function getAllAgents(env: any) {
  try {
    if (!env.AGENTS_KV) {
      return {};
    }
    const agentsJson = await env.AGENTS_KV.get(AGENTS_KEY);
    if (agentsJson) {
      return JSON.parse(agentsJson);
    }
    return {};
  } catch (e) {
    return {};
  }
}

export async function purchaseAgent(req: Request, env: any): Promise<Response> {
  try {
    const body = await req.json() as { agent: string; email?: string };
    
    if (!body.agent) {
      return new Response(JSON.stringify({ error: "invalid: agent name required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get agent
    const agents = await getAllAgents(env);
    const agent = agents[body.agent];

    if (!agent) {
      return new Response(JSON.stringify({ error: "agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Free agents - no purchase needed
    if (!agent.price || agent.price === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Agent is free",
        agent 
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check for Stripe key
    if (!env.STRIPE_KEY) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Create Stripe checkout session
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': `${agent.name} Agent`,
        'line_items[0][price_data][product_data][description]': agent.description || '',
        'line_items[0][price_data][unit_amount]': String(agent.price * 100),
        'line_items[0][quantity]': '1',
        'success_url': `https://rinawarptech.com/agents?purchased=${agent.name}`,
        'cancel_url': 'https://rinawarptech.com/agents',
      })
    });

    const session = await stripeRes.json();

    if (session.error) {
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
