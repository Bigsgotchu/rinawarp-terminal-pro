/**
 * RinaWarp Marketplace API - Publish Handler
 */

interface AgentPackage {
  name: string
  description: string
  author: string
  version: string
  commands: { name: string; steps: string[] }[]
  downloads?: number
  price?: number
}

const AGENTS_KEY = 'agents'
const PUBLISH_TOKEN_HEADER = 'x-rinawarp-publish-token'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isAuthorized(req: Request, env: any): boolean {
  const expected = String(env.MARKETPLACE_PUBLISH_TOKEN || '').trim()
  if (!expected) return false

  const headerToken = String(req.headers.get(PUBLISH_TOKEN_HEADER) || '').trim()
  const authHeader = String(req.headers.get('authorization') || '').trim()
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''

  return headerToken === expected || bearerToken === expected
}

async function getAllAgents(env: any): Promise<Record<string, AgentPackage>> {
  try {
    if (!env.AGENTS_KV) {
      return {}
    }
    const agentsJson = await env.AGENTS_KV.get(AGENTS_KEY)
    if (agentsJson) {
      return JSON.parse(agentsJson)
    }
    return {}
  } catch (e) {
    console.error('Error getting agents:', e)
    return {}
  }
}

async function saveAgent(agent: AgentPackage, env: any): Promise<void> {
  const agents = await getAllAgents(env)
  agents[agent.name] = { ...agent, downloads: agent.downloads || 0 }
  await env.AGENTS_KV.put(AGENTS_KEY, JSON.stringify(agents))
}

export async function publishAgent(req: Request, env: any): Promise<Response> {
  try {
    if (!String(env.MARKETPLACE_PUBLISH_TOKEN || '').trim()) {
      return jsonResponse(503, {
        error: 'Marketplace publishing is not enabled on this environment.',
      })
    }

    if (!isAuthorized(req, env)) {
      return jsonResponse(401, {
        error: `Unauthorized. Provide ${PUBLISH_TOKEN_HEADER} or a Bearer token.`,
      })
    }

    const body = (await req.json()) as AgentPackage

    if (!body.name) {
      return jsonResponse(400, { error: 'invalid: name required' })
    }

    // Validate commands
    if (!body.commands || !Array.isArray(body.commands) || body.commands.length === 0) {
      return jsonResponse(400, { error: 'invalid: commands required' })
    }

    if (!/^[a-z0-9-]{2,64}$/i.test(body.name)) {
      return jsonResponse(400, {
        error: 'invalid: name must be 2-64 characters and contain only letters, numbers, or dashes',
      })
    }

    await saveAgent(body, env)

    return jsonResponse(200, { success: true, agent: body })
  } catch (e) {
    return jsonResponse(400, { error: 'invalid JSON' })
  }
}
