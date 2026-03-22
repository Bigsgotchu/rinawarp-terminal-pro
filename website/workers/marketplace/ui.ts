/**
 * RinaWarp Marketplace UI Handler
 *
 * Renders the branded marketplace HTML page
 */

import { injectSeoTags } from '../seo'

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

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

export async function marketplaceUI(req: Request, env: any): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname

  // Only handle /agents route
  if (path !== '/agents' && path !== '/agents/') {
    return new Response('Not Found', { status: 404 })
  }

  let agents: any[] = []
  let apiAvailable = true

  try {
    const agentsData = await getAllAgents(env)
    agents = Object.values(agentsData)
  } catch (e) {
    apiAvailable = false
  }

  agents.sort((a, b) => (b.downloads || 0) - (a.downloads || 0))

  const agentCards = agents
    .map(
      (agent: any) => `
    <div class="agent-card">
      <div class="agent-header">
        <h3>${escapeHtml(agent.name)}</h3>
        <span class="downloads">${agent.downloads || 0} installs</span>
      </div>
      <p class="description">${escapeHtml(agent.description || 'No description')}</p>
      <div class="meta">
        <span class="author">by ${escapeHtml(agent.author || 'unknown')}</span>
        ${agent.price ? `<span class="price">$${agent.price}</span>` : '<span class="free">Free</span>'}
      </div>
      <div class="commands">
        <strong>Commands:</strong>
        ${(agent.commands || []).map((cmd: any) => `<code>${escapeHtml(cmd.name)}</code>`).join(', ')}
      </div>
      <div class="cmd">
        <code>rina install ${escapeHtml(agent.name)}</code>
        <button type="button" data-copy-command="rina install ${escapeHtml(agent.name)}">Copy</button>
      </div>
    </div>
  `
    )
    .join('')

  const seo = injectSeoTags('/agents')

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${seo}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #07111a; color: #edf6ff; font-family: "IBM Plex Sans", "Segoe UI", Inter, system-ui, sans-serif; min-height: 100vh; }
    header { background: rgba(7, 17, 26, 0.78); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(148, 163, 184, 0.16); padding: 0 28px; }
    nav { display: flex; align-items: center; justify-content: space-between; max-width: 1160px; margin: 0 auto; min-height: 70px; gap: 16px; }
    .logo { font-size: 1.1rem; color: white; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 10px; }
    .logo img { width: 32px; height: 32px; border-radius: 10px; object-fit: cover; box-shadow: 0 8px 24px rgba(255, 79, 216, 0.18); }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { color: #a3b6c9; text-decoration: none; font-size: 0.93rem; transition: color 0.2s, background 0.2s; padding: 8px 12px; border-radius: 999px; }
    .nav-links a:hover, .nav-links a.active { color: #edf6ff; background: rgba(255,255,255,0.06); }
    .hero { text-align: left; padding: 72px 28px 24px; max-width: 1160px; margin: 0 auto; }
    .hero h1 { font-size: clamp(2.4rem, 5vw, 4rem); line-height: 0.98; margin-bottom: 14px; letter-spacing: -0.04em; max-width: 11ch; }
    .subtitle { color: #a3b6c9; font-size: 1.06rem; line-height: 1.7; max-width: 62ch; }
    .container { max-width: 1160px; margin: 0 auto; padding: 24px 28px 56px; }
    .summary { background: rgba(255,255,255,0.03); border: 1px solid rgba(148, 163, 184, 0.16); padding: 16px 18px; border-radius: 18px; margin-bottom: 24px; font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center; gap: 16px; color: #d8f3ff; }
    .summary small { color: #a3b6c9; }
    .agent-count { color: #a3b6c9; font-size: 0.85rem; }
    .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
    .agent-card { background: rgba(10, 21, 32, 0.84); border: 1px solid rgba(148, 163, 184, 0.16); border-radius: 22px; padding: 20px; transition: transform 0.2s, border-color 0.2s; box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28); }
    .agent-card:hover { transform: translateY(-2px); border-color: rgba(125, 211, 252, 0.3); }
    .agent-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .agent-header h3 { font-size: 1.2rem; color: #fff; }
    .downloads { font-size: 0.75rem; color: #7dd3fc; }
    .description { color: #a3b6c9; font-size: 0.92rem; line-height: 1.6; margin-bottom: 16px; min-height: 48px; }
    .meta { display: flex; gap: 12px; font-size: 0.82rem; color: #8aa0b3; margin-bottom: 12px; flex-wrap: wrap; }
    .price { color: #7dd3fc; font-weight: 600; }
    .free { color: #c4b5fd; font-weight: 600; }
    .commands { font-size: 0.82rem; color: #a3b6c9; margin-bottom: 16px; }
    .commands code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 6px; margin-right: 4px; }
    .cmd { display: flex; justify-content: space-between; align-items: center; background: #06111a; padding: 10px 12px; border-radius: 14px; gap: 10px; border: 1px solid rgba(148, 163, 184, 0.12); }
    .cmd code { color: #d8f3ff; font-size: 0.85rem; flex: 1; }
    .cmd button { background: linear-gradient(135deg, #7dd3fc, #57c7ff 48%, #8b5cf6 100%); color: #08121b; border: none; padding: 7px 12px; border-radius: 999px; cursor: pointer; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
    .cta { margin-top: 40px; text-align: left; padding: 32px; background: rgba(10, 21, 32, 0.84); border-radius: 22px; border: 1px solid rgba(148, 163, 184, 0.16); }
    .cta h2 { font-size: 1.55rem; margin-bottom: 14px; color: #edf6ff; }
    .cta p { color: #a3b6c9; margin-bottom: 20px; line-height: 1.6; }
    .cta a { display: inline-block; padding: 12px 18px; background: rgba(255,255,255,0.03); color: #edf6ff; text-decoration: none; border-radius: 999px; border: 1px solid rgba(148, 163, 184, 0.16); font-weight: 600; }
    .empty { text-align: center; color: #a3b6c9; padding: 40px; border: 1px dashed rgba(148, 163, 184, 0.18); border-radius: 18px; }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="/" class="logo"><img src="/assets/img/rinawarp-mark.svg" alt="RinaWarp Terminal Pro logo">RinaWarp Terminal Pro</a>
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/pricing">Pricing</a>
        <a href="/download">Download</a>
        <a href="/docs">Docs</a>
        <a href="/agents" class="active">Packs</a>
        <a href="/feedback">Support</a>
      </div>
    </nav>
  </header>
  
  <main>
    <div class="hero">
      <h1>Capability packs for the proof-first workbench.</h1>
      <p class="subtitle">These packs extend what Rina can do inside the desktop app. Think deployment helpers, diagnostics, security, and repeated workflows, not a detached plugin bazaar.</p>
    </div>
    
    <div class="container">
      <div class="summary">
        <span>${apiAvailable ? 'Curated marketplace live.' : 'Marketplace data is temporarily unavailable.'}</span>
        <span class="agent-count">${agents.length} agents</span>
      </div>
      
      ${
        agents.length > 0
          ? `
      <div class="agents-grid">
        ${agentCards}
      </div>
      `
          : '<p class="empty">No agents available yet. Be the first to publish!</p>'
      }
      
      <div class="cta">
        <h2>Need a pack we do not ship yet?</h2>
        <p>Tell us what workflow you want to trust Rina with. We are prioritizing real deploy, diagnostics, and operator flows over random breadth.</p>
        <a href="/feedback">Request a capability pack</a>
      </div>
    </div>
  </main>
  
  <script>
    document.querySelectorAll('[data-copy-command]').forEach((button) => {
      button.addEventListener('click', async () => {
        const command = button.getAttribute('data-copy-command') || '';
        try {
          await navigator.clipboard.writeText(command);
          const previous = button.textContent;
          button.textContent = 'Copied';
          setTimeout(() => {
            button.textContent = previous;
          }, 1200);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
    });
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
