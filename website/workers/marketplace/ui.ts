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
  const selectedAgent = url.searchParams.get('agent')?.trim().toLowerCase() || ''

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

  if (selectedAgent) {
    agents.sort((left, right) => {
      if (left.name === selectedAgent) return -1
      if (right.name === selectedAgent) return 1
      return 0
    })
  }

  const agentCards = agents
    .map(
      (agent: any) => `
    <div class="agent-card${agent.name === selectedAgent ? ' agent-card-featured' : ''}"${agent.name === selectedAgent ? ' id="selected-agent"' : ''}>
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
  <meta name="theme-color" content="#ff9b6b">
  <meta name="color-scheme" content="dark">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="msapplication-TileColor" content="#ff4fd8">
  <link rel="preconnect" href="https://pub-58c0b2f3cc8d43fa8cf6e1d4d2dcf94b.r2.dev" crossorigin>
  <link rel="preconnect" href="https://pub-4df343f1b4524762a4f8ad3c744653c9.r2.dev" crossorigin>
  ${seo}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      color-scheme: dark;
      --bg: #0b1020;
      --surface: rgba(10, 21, 32, 0.84);
      --line: rgba(148, 163, 184, 0.16);
      --line-strong: rgba(98, 246, 229, 0.28);
      --text: #edf6ff;
      --muted: #a3b6c9;
      --accent: #62f6e5;
      --shadow: 0 16px 36px rgba(0, 0, 0, 0.22);
      --radius: 18px;
      --radius-sm: 12px;
      --content: 1080px;
    }
    body {
      min-height: 100vh;
      color: var(--text);
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top, rgba(255, 79, 216, 0.11), transparent 30%),
        radial-gradient(circle at 85% 12%, rgba(98, 246, 229, 0.10), transparent 22%),
        linear-gradient(180deg, #090d18 0%, #0b1020 100%);
    }
    a { color: inherit; text-decoration: none; }
    .skip-link {
      position: absolute;
      left: 16px;
      top: -48px;
      z-index: 50;
      padding: 10px 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, #ff4fd8, #ff9b6b, #62f6e5, #8fefff);
      color: #08121b;
      font-weight: 700;
      transition: top 0.2s ease;
    }
    .skip-link:focus-visible { top: 16px; }
    .site-shell { min-height: 100vh; display: flex; flex-direction: column; }
    header { background: rgba(7, 17, 26, 0.78); backdrop-filter: blur(20px); border-bottom: 1px solid var(--line); }
    nav {
      min-height: 64px;
      max-width: var(--content);
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .logo { display: inline-flex; align-items: center; gap: 12px; }
    .logo-mark { width: 38px; height: 38px; border-radius: 10px; object-fit: contain; }
    .logo-wordmark { height: 28px; width: auto; object-fit: contain; }
    .nav-links {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      font-size: 0.88rem;
      color: var(--muted);
    }
    .nav-links a { padding: 6px 10px; border-radius: 999px; transition: color 0.2s, background 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--text); background: rgba(255,255,255,0.04); }
    main { flex: 1; }
    .hero, .container { max-width: var(--content); margin: 0 auto; padding: 26px 24px; }
    .hero { padding-top: 56px; }
    .eyebrow {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.68rem;
      font-weight: 700;
      border: 1px solid var(--line-strong);
      border-radius: 999px;
      padding: 6px 10px;
      color: #d8f3ff;
      background: linear-gradient(135deg, rgba(255, 79, 216, 0.11), rgba(98, 246, 229, 0.11));
    }
    .hero h1 { font-size: clamp(1.85rem, 3vw, 3.2rem); line-height: 1.02; margin-top: 10px; letter-spacing: -0.04em; max-width: 12ch; }
    .subtitle, p, li { color: var(--muted); font-size: 0.95rem; line-height: 1.58; }
    .subtitle { max-width: 64ch; margin-top: 14px; }
    .summary, .agent-card, .cta {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
    }
    .summary {
      padding: 14px 16px;
      border-radius: 16px;
      margin-bottom: 20px;
      font-size: 0.92rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      color: #d8f3ff;
    }
    .agent-count { color: var(--muted); font-size: 0.82rem; }
    .agents-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .agent-card {
      border-radius: var(--radius-sm);
      padding: 18px;
      transition: transform 0.2s, border-color 0.2s;
    }
    .agent-card:hover { transform: translateY(-2px); border-color: rgba(125, 211, 252, 0.3); }
    .agent-card-featured { border-color: rgba(125, 211, 252, 0.48); }
    .agent-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
    .agent-header h3 { font-size: 1rem; color: #fff; }
    .downloads { font-size: 0.75rem; color: #7dd3fc; white-space: nowrap; }
    .description { margin-bottom: 14px; min-height: 42px; }
    .meta { display: flex; gap: 12px; font-size: 0.8rem; color: #8aa0b3; margin-bottom: 12px; flex-wrap: wrap; }
    .price { color: #7dd3fc; font-weight: 600; }
    .free { color: #c4b5fd; font-weight: 600; }
    .commands { font-size: 0.8rem; color: #a3b6c9; margin-bottom: 14px; }
    .commands code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 6px; margin-right: 4px; }
    .cmd {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #06111a;
      padding: 10px 12px;
      border-radius: 14px;
      gap: 10px;
      border: 1px solid rgba(148, 163, 184, 0.12);
    }
    .cmd code { color: #d8f3ff; font-size: 0.82rem; flex: 1; }
    .cmd button {
      background: linear-gradient(135deg, #62f6e5 0%, #8fefff 24%, #ff9b6b 62%, #ff4fd8 100%);
      color: #08121b;
      border: none;
      padding: 7px 12px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .cta {
      margin-top: 28px;
      text-align: left;
      padding: 20px;
      border-radius: var(--radius-sm);
    }
    .cta h2 { font-size: 1.28rem; margin-bottom: 8px; color: #edf6ff; }
    .cta p { margin-bottom: 16px; }
    .cta a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 16px;
      background: rgba(255,255,255,0.03);
      border-radius: 999px;
      border: 1px solid var(--line);
      font-weight: 600;
    }
    .empty { text-align: center; color: var(--muted); padding: 32px; border: 1px dashed rgba(148, 163, 184, 0.18); border-radius: 16px; }
    footer { border-top: 1px solid var(--line); padding: 22px 24px 32px; color: var(--muted); }
    .footer-inner {
      max-width: var(--content);
      margin: 0 auto;
      display: flex;
      gap: 14px;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .footer-links { display: flex; gap: 16px; flex-wrap: wrap; }
    @media (max-width: 860px) {
      nav { padding-top: 16px; padding-bottom: 16px; align-items: flex-start; flex-direction: column; }
      .hero { padding-top: 40px; }
      .hero h1 { max-width: 100%; }
      .logo-wordmark { height: 24px; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="site-shell">
  <header>
    <nav aria-label="Main navigation">
      <a href="/" class="logo" aria-label="RinaWarp Terminal Pro home">
        <img class="logo-mark" src="/assets/img/rinawarp-mark.svg" alt="RinaWarp Terminal Pro mark">
        <img class="logo-wordmark" src="/assets/img/rinawarp-logo.png" alt="RinaWarp Terminal Pro logo">
      </a>
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/pricing">Pricing</a>
        <a href="/team">Team</a>
        <a href="/download">Download</a>
        <a href="/docs">Docs</a>
        <a href="/agents" class="active" aria-current="page">Packs</a>
        <a href="/feedback">Support</a>
        <a href="/account">Account</a>
      </div>
    </nav>
  </header>

  <main id="main-content" tabindex="-1">
    <div class="hero">
      <span class="eyebrow">Capability packs</span>
      <h1>Capability packs for the proof-first workbench.</h1>
      <p class="subtitle">These packs extend what Rina can do inside the desktop app. Think deployment helpers, diagnostics, security, and repeated workflows, not a detached plugin bazaar.</p>
    </div>
    
    <div class="container">
      <div class="summary">
        <span>${apiAvailable ? (selectedAgent ? `Showing recommended pack: ${escapeHtml(selectedAgent)}.` : 'Curated marketplace live.') : 'Marketplace data is temporarily unavailable.'}</span>
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
  <footer>
    <div class="footer-inner">
      <div>© 2026 RinaWarp Technologies, LLC. Proof-first AI workbench.</div>
      <div class="footer-links">
        <a href="/docs">Docs</a>
        <a href="/pricing">Pricing</a>
        <a href="/download">Download</a>
        <a href="/feedback">Support</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/early-access">Early Access</a>
      </div>
    </div>
  </footer>
  </div>
  
  <script>
    const selected = document.getElementById('selected-agent');
    if (selected) {
      selected.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
