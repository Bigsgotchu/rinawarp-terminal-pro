/**
 * RinaWarp Marketplace UI Handler
 * 
 * Renders the branded marketplace HTML page
 */

import { injectSeoTags } from "../seo";

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

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export async function marketplaceUI(req: Request, env: any): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Only handle /agents route
  if (path !== "/agents" && path !== "/agents/") {
    return new Response("Not Found", { status: 404 });
  }

  let agents: any[] = [];
  let apiAvailable = true;
  
  try {
    const agentsData = await getAllAgents(env);
    agents = Object.values(agentsData);
  } catch (e) {
    apiAvailable = false;
  }
  
  agents.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  
  const agentCards = agents.map((agent: any) => `
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
        <button onclick="copyCmd('rina install ${escapeHtml(agent.name)}')">Copy</button>
      </div>
    </div>
  `).join('');

  const seo = injectSeoTags("/agents");
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${seo}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; color: white; font-family: Inter, system-ui, -apple-system, sans-serif; min-height: 100vh; }
    header { background: #111; border-bottom: 1px solid #222; padding: 0 40px; }
    nav { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; height: 60px; }
    .logo { font-size: 1.5rem; color: white; text-decoration: none; font-weight: bold; }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { color: #888; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: #ff007f; }
    .hero { text-align: center; padding: 60px 20px; background: linear-gradient(180deg, #111 0%, #0a0a0a 100%); }
    .hero h1 { font-size: 2.5rem; margin-bottom: 12px; background: linear-gradient(90deg, #ff007f, #ff7f50, #00ffff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #888; font-size: 1.1rem; }
    .container { max-width: 1100px; margin: 0 auto; padding: 40px; }
    .api-status { background: #111; border: 1px solid #222; padding: 12px 16px; border-radius: 8px; margin-bottom: 30px; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center; }
    .api-status.available { border-color: #00ffff; color: #00ffff; }
    .api-status.unavailable { border-color: #ff7f50; color: #ff7f50; }
    .agent-count { color: #666; font-size: 0.8rem; }
    .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
    .agent-card { background: #111; border: 1px solid #222; border-radius: 12px; padding: 20px; transition: transform 0.2s, border-color 0.2s; }
    .agent-card:hover { transform: translateY(-2px); border-color: #ff007f; }
    .agent-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .agent-header h3 { font-size: 1.2rem; color: #fff; }
    .downloads { font-size: 0.75rem; color: #00ffff; }
    .description { color: #aaa; font-size: 0.9rem; line-height: 1.5; margin-bottom: 16px; min-height: 40px; }
    .meta { display: flex; gap: 12px; font-size: 0.8rem; color: #666; margin-bottom: 12px; }
    .price { color: #00ffff; font-weight: 600; }
    .free { color: #ff007f; font-weight: 600; }
    .commands { font-size: 0.8rem; color: #888; margin-bottom: 16px; }
    .commands code { background: #222; padding: 2px 6px; border-radius: 4px; margin-right: 4px; }
    .cmd { display: flex; justify-content: space-between; align-items: center; background: #000; padding: 10px 12px; border-radius: 8px; gap: 10px; }
    .cmd code { color: #00ffff; font-size: 0.85rem; flex: 1; }
    .cmd button { background: #ff007f; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
    .cmd button:hover { background: #ff4fa0; }
    .cta { margin-top: 50px; text-align: center; padding: 40px; background: #111; border-radius: 12px; border: 1px solid #222; }
    .cta h2 { font-size: 1.5rem; margin-bottom: 16px; background: linear-gradient(90deg, #ff007f, #ff7f50); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .cta p { color: #888; margin-bottom: 20px; }
    .cta a { display: inline-block; padding: 12px 24px; background: linear-gradient(90deg, #ff007f, #ff7f50); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .empty { text-align: center; color: #666; padding: 40px; }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="/" class="logo">🤖 RinaWarp</a>
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/agents" class="active">Agents</a>
        <a href="/pricing">Pricing</a>
        <a href="/download">Download</a>
        <a href="/docs">Docs</a>
      </div>
    </nav>
  </header>
  
  <main>
    <div class="hero">
      <h1>🤖 Agent Marketplace</h1>
      <p class="subtitle">Discover automation agents for your development workflow</p>
    </div>
    
    <div class="container">
      <div class="api-status ${apiAvailable ? 'available' : 'unavailable'}">
        <span>${apiAvailable ? '✓ Connected to marketplace' : '⚠ API not available'}</span>
        <span class="agent-count">${agents.length} agents</span>
      </div>
      
      ${agents.length > 0 ? `
      <div class="agents-grid">
        ${agentCards}
      </div>
      ` : '<p class="empty">No agents available yet. Be the first to publish!</p>'}
      
      <div class="cta">
        <h2>🚀 Build Your Own Agent</h2>
        <p>Create and publish your own automation agent in minutes</p>
        <a href="/docs/agents">Get Started →</a>
      </div>
    </div>
  </main>
  
  <script>
    function copyCmd(cmd) {
      navigator.clipboard.writeText(cmd).then(() => {
        alert('Copied: ' + cmd);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
