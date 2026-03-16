/**
 * RinaWarp Marketplace API - Publish Handler
 */

interface AgentPackage {
  name: string;
  description: string;
  author: string;
  version: string;
  commands: { name: string; steps: string[] }[];
  downloads?: number;
  price?: number;
}

const AGENTS_KEY = "agents";

async function getAllAgents(env: any): Promise<Record<string, AgentPackage>> {
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
    console.error('Error getting agents:', e);
    return {};
  }
}

async function saveAgent(agent: AgentPackage, env: any): Promise<void> {
  const agents = await getAllAgents(env);
  agents[agent.name] = { ...agent, downloads: agent.downloads || 0 };
  await env.AGENTS_KV.put(AGENTS_KEY, JSON.stringify(agents));
}

export async function publishAgent(req: Request, env: any): Promise<Response> {
  try {
    const body = await req.json() as AgentPackage;
    
    if (!body.name) {
      return new Response(JSON.stringify({ error: "invalid: name required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate commands
    if (!body.commands || !Array.isArray(body.commands) || body.commands.length === 0) {
      return new Response(JSON.stringify({ error: "invalid: commands required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await saveAgent(body, env);
    
    return new Response(JSON.stringify({ success: true, agent: body }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
