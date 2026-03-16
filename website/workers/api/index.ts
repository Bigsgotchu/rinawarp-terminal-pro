/**
 * RinaWarp Marketplace API Router
 * 
 * Routes API requests to appropriate handlers
 */

import { listAgents, getAgent } from "./agents";
import { publishAgent } from "./publish";
import { rateAgent } from "./rate";
import { purchaseAgent } from "./purchase";

export async function apiRouter(req: Request, env: any): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace("/v1", "");
  const method = req.method;

  // CORS headers
  const origin = req.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { headers });
  }

  // GET /agents - List all agents
  if (method === "GET" && path === "/agents") {
    return listAgents(env);
  }

  // GET /agents/:name - Get single agent
  if (method === "GET" && path.startsWith("/agents/")) {
    const name = path.split("/")[2];
    return getAgent(name, env);
  }

  // POST /publish - Publish agent
  if (method === "POST" && path === "/publish") {
    return publishAgent(req, env);
  }

  // POST /rate - Rate agent
  if (method === "POST" && path === "/rate") {
    return rateAgent(req, env);
  }

  // POST /purchase - Purchase paid agent
  if (method === "POST" && path === "/purchase") {
    return purchaseAgent(req, env);
  }

  return new Response(JSON.stringify({ error: "not found" }), {
    status: 404,
    headers: { ...headers, "Content-Type": "application/json" }
  });
}
