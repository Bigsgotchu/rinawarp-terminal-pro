// website/workers/api/agents.ts
var AGENTS_KEY = "agents";
var defaultAgents = {
  "deploy-helper": {
    name: "deploy-helper",
    description: "Common deployment helpers for Vercel, Netlify, and Docker",
    author: "RinaWarp",
    version: "1.0.0",
    commands: [
      { name: "vercel", steps: ["npm i -g vercel", "vercel --prod"] },
      { name: "netlify", steps: ["npm i -g netlify-cli", "netlify deploy --prod"] },
      { name: "docker", steps: ["docker build -t app .", "docker tag app:latest registry.example.com/app:latest", "docker push registry.example.com/app:latest"] }
    ],
    downloads: 0,
    price: 5
  },
  "docker-cleanup": {
    name: "docker-cleanup",
    description: "Clean up Docker resources - remove unused containers, images, and volumes",
    author: "RinaWarp",
    version: "1.0.0",
    commands: [
      { name: "clean", steps: ["docker system prune -af", "docker volume prune -f"] },
      { name: "status", steps: ["docker system df"] }
    ],
    downloads: 0,
    price: 3
  },
  "security-audit": {
    name: "security-audit",
    description: "Run security audits on your project - npm audit, secrets detection, dependency checks",
    author: "RinaWarp",
    version: "1.0.0",
    commands: [
      { name: "audit", steps: ["npm audit --json > audit-report.json", "cat audit-report.json | head -50"] },
      { name: "secrets", steps: ["grep -r -E '(api_key|password|secret|token)' --include='*.env' . || echo 'No secrets found'"] },
      { name: "deps", steps: ["npm outdated", "npm audit"] }
    ],
    downloads: 0,
    price: 5
  },
  "test-runner": {
    name: "test-runner",
    description: "Run and manage tests - Jest, Vitest, Mocha, Playwright",
    author: "RinaWarp",
    version: "1.0.0",
    commands: [
      { name: "jest", steps: ["npx jest --coverage"] },
      { name: "vitest", steps: ["npx vitest run --coverage"] },
      { name: "playwright", steps: ["npx playwright test"] },
      { name: "watch", steps: ["npx vitest"] }
    ],
    downloads: 0,
    price: 4
  },
  "docker-repair": {
    name: "docker-repair",
    description: "Fix Docker environments automatically. Diagnoses and repairs common Docker issues like port conflicts, stuck containers, and network problems.",
    author: "RinaWarp",
    version: "1.0.0",
    commands: [{ name: "fix", steps: ["docker system prune -f", "docker-compose restart"] }],
    downloads: 0,
    price: 0
  },
  "git-cleanup": {
    name: "git-cleanup",
    description: "Clean up Git repositories. Removes merged branches, expired reflogs, and unwanted tags.",
    author: "RinaWarp",
    version: "1.0.0",
    commands: [{ name: "clean", steps: ["git branch --merged | xargs git branch -d"] }],
    downloads: 0,
    price: 0
  },
  "npm-audit": {
    name: "npm-audit",
    description: "Fix npm security vulnerabilities. Automatically updates and fixes security issues in your node_modules.",
    author: "RinaWarp",
    version: "1.0.0",
    commands: [{ name: "fix", steps: ["npm audit fix --force"] }],
    downloads: 0,
    price: 0
  },
  "system-diagnostics": {
    name: "system-diagnostics",
    description: "Full system diagnostic agent. Collects logs, checks resource usage, and identifies common issues.",
    author: "RinaWarp",
    version: "1.0.0",
    commands: [{ name: "diagnose", steps: ["df -h", "free -m", "top -bn1"] }],
    downloads: 0,
    price: 0
  }
};
async function getAllAgents(env) {
  try {
    if (!env.AGENTS_KV) {
      return defaultAgents;
    }
    const agentsJson = await env.AGENTS_KV.get(AGENTS_KEY);
    if (agentsJson) {
      return JSON.parse(agentsJson);
    }
    await env.AGENTS_KV.put(AGENTS_KEY, JSON.stringify(defaultAgents));
    return defaultAgents;
  } catch (e) {
    console.error("Error getting agents:", e);
    return defaultAgents;
  }
}
async function listAgents(env) {
  const agents = await getAllAgents(env);
  return new Response(JSON.stringify({ agents: Object.values(agents) }), {
    headers: { "Content-Type": "application/json" }
  });
}
async function getAgent(name, env) {
  const agents = await getAllAgents(env);
  const agent = agents[name];
  if (!agent) {
    return new Response(JSON.stringify({ error: "agent not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  const updatedAgent = { ...agent, downloads: (agent.downloads || 0) + 1 };
  agents[name] = updatedAgent;
  try {
    await env.AGENTS_KV.put(AGENTS_KEY, JSON.stringify(agents));
  } catch (e) {
    console.error("Error updating downloads:", e);
  }
  return new Response(JSON.stringify(updatedAgent), {
    headers: { "Content-Type": "application/json" }
  });
}

// website/workers/api/publish.ts
var AGENTS_KEY2 = "agents";
async function getAllAgents2(env) {
  try {
    if (!env.AGENTS_KV) {
      return {};
    }
    const agentsJson = await env.AGENTS_KV.get(AGENTS_KEY2);
    if (agentsJson) {
      return JSON.parse(agentsJson);
    }
    return {};
  } catch (e) {
    console.error("Error getting agents:", e);
    return {};
  }
}
async function saveAgent(agent, env) {
  const agents = await getAllAgents2(env);
  agents[agent.name] = { ...agent, downloads: agent.downloads || 0 };
  await env.AGENTS_KV.put(AGENTS_KEY2, JSON.stringify(agents));
}
async function publishAgent(req, env) {
  try {
    const body = await req.json();
    if (!body.name) {
      return new Response(JSON.stringify({ error: "invalid: name required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
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

// website/workers/api/rate.ts
async function rateAgent(req, env) {
  try {
    const body = await req.json();
    if (!body.agent || !body.rating || body.rating < 1 || body.rating > 5) {
      return new Response(JSON.stringify({ error: "invalid: agent and rating (1-5) required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const ratings = env.RATINGS || [];
    ratings.push({ agent: body.agent, rating: body.rating, userId: body.userId });
    const agentRatings = ratings.filter((r) => r.agent === body.agent);
    const avg = agentRatings.reduce((sum, r) => sum + r.rating, 0) / agentRatings.length;
    return new Response(JSON.stringify({
      success: true,
      averageRating: avg.toFixed(1),
      totalRatings: agentRatings.length
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// website/workers/api/purchase.ts
var AGENTS_KEY3 = "agents";
async function getAllAgents3(env) {
  try {
    if (!env.AGENTS_KV) {
      return {};
    }
    const agentsJson = await env.AGENTS_KV.get(AGENTS_KEY3);
    if (agentsJson) {
      return JSON.parse(agentsJson);
    }
    return {};
  } catch (e) {
    return {};
  }
}
async function purchaseAgent(req, env) {
  try {
    const body = await req.json();
    if (!body.agent) {
      return new Response(JSON.stringify({ error: "invalid: agent name required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const agents = await getAllAgents3(env);
    const agent = agents[body.agent];
    if (!agent) {
      return new Response(JSON.stringify({ error: "agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!agent.price || agent.price === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "Agent is free",
        agent
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!env.STRIPE_KEY) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      });
    }
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.STRIPE_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        "mode": "payment",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": `${agent.name} Agent`,
        "line_items[0][price_data][product_data][description]": agent.description || "",
        "line_items[0][price_data][unit_amount]": String(agent.price * 100),
        "line_items[0][quantity]": "1",
        "success_url": `https://rinawarptech.com/agents?purchased=${agent.name}`,
        "cancel_url": "https://rinawarptech.com/agents"
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

// website/workers/api/index.ts
async function apiRouter(req, env) {
  const url = new URL(req.url);
  const path = url.pathname.replace("/v1", "");
  const method = req.method;
  const origin = req.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (method === "OPTIONS") {
    return new Response(null, { headers });
  }
  if (method === "GET" && path === "/agents") {
    return listAgents(env);
  }
  if (method === "GET" && path.startsWith("/agents/")) {
    const name = path.split("/")[2];
    return getAgent(name, env);
  }
  if (method === "POST" && path === "/publish") {
    return publishAgent(req, env);
  }
  if (method === "POST" && path === "/rate") {
    return rateAgent(req, env);
  }
  if (method === "POST" && path === "/purchase") {
    return purchaseAgent(req, env);
  }
  return new Response(JSON.stringify({ error: "not found" }), {
    status: 404,
    headers: { ...headers, "Content-Type": "application/json" }
  });
}

// website/workers/seo.ts
var SEO_CONFIG = {
  "/": {
    title: "RinaWarp Terminal Pro",
    description: "The AI-powered terminal for developers. Manage agents, plugins, and tools efficiently. Automate workflows, run tests, and deploy apps.",
    canonical: "https://rinawarptech.com/",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "AI, terminal, developer tools, automation, AI agents, developer productivity, Linux, Windows, macOS"
  },
  "/agents": {
    title: "Agent Marketplace",
    description: "Browse and install AI agents for RinaWarp Terminal Pro. Free and premium agents available. Security audits, deployment helpers, and more.",
    canonical: "https://rinawarptech.com/agents",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "AI agents, marketplace, plugins, RinaWarp, developer tools, automation"
  },
  "/pricing": {
    title: "Pricing Plans",
    description: "Compare subscription plans for RinaWarp Terminal Pro. Pro, Creator, Team, and Lifetime options. Start free or upgrade for full features.",
    canonical: "https://rinawarptech.com/pricing",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "pricing, subscription, RinaWarp, plans, Pro, Creator, Team, lifetime"
  },
  "/download": {
    title: "Download",
    description: "Download RinaWarp Terminal Pro for macOS, Windows, and Linux. Verify downloads with SHA256 and GPG signatures for security.",
    canonical: "https://rinawarptech.com/download",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "download, RinaWarp, terminal, AI, developer tools, Linux, Windows, macOS, AppImage, deb, exe"
  },
  "/feedback": {
    title: "Feedback",
    description: "Send us feedback to improve RinaWarp Terminal Pro. Feature requests, bug reports, and suggestions welcome.",
    canonical: "https://rinawarptech.com/feedback",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "feedback, support, contact, RinaWarp, suggestions, bug report"
  },
  "/docs": {
    title: "Documentation",
    description: "Learn how to use RinaWarp Terminal Pro. Build, publish, and manage AI agents for your development workflow.",
    canonical: "https://rinawarptech.com/docs",
    ogImage: "https://rinawarptech.com/assets/img/rinawarp-logo.png",
    keywords: "documentation, docs, RinaWarp, guides, tutorials, AI agents, development"
  }
};
function injectSeoTags(path) {
  const normalizedPath = path === "/" ? "/" : path.replace(/\/$/, "");
  const seo = SEO_CONFIG[normalizedPath] || SEO_CONFIG["/"];
  const metaTags = `
  <!-- Primary Meta Tags -->
  <title>${seo.title} - RinaWarp Terminal Pro</title>
  <meta name="description" content="${seo.description}">
  ${seo.keywords ? `<meta name="keywords" content="${seo.keywords}">` : ""}
  <meta name="author" content="RinaWarp Tech">

  <!-- Canonical URL -->
  <link rel="canonical" href="${seo.canonical}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${seo.title} - RinaWarp Terminal Pro">
  <meta property="og:description" content="${seo.description}">
  <meta property="og:url" content="${seo.canonical}">
  <meta property="og:image" content="${seo.ogImage}">
  <meta property="og:site_name" content="RinaWarp Terminal Pro">

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${seo.title} - RinaWarp Terminal Pro">
  <meta name="twitter:description" content="${seo.description}">
  <meta name="twitter:image" content="${seo.ogImage}">
  <meta name="twitter:site" content="@RinaWarpTech">

  <!-- Favicon -->
  <link rel="icon" href="/assets/img/rinawarp-logo.png" type="image/png">
  <link rel="shortcut icon" href="/assets/img/rinawarp-logo.png" type="image/png">
  
  <!-- Preconnect to external domains for performance -->

  <!-- Content Security Policy -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';">
  
  <!-- Base URL for relative links -->
  <base href="/">
`;
  return metaTags;
}

// website/workers/marketplace/ui.ts
var AGENTS_KEY4 = "agents";
async function getAllAgents4(env) {
  try {
    if (!env.AGENTS_KV) {
      return {};
    }
    const agentsJson = await env.AGENTS_KV.get(AGENTS_KEY4);
    if (agentsJson) {
      return JSON.parse(agentsJson);
    }
    return {};
  } catch (e) {
    console.error("Error getting agents:", e);
    return {};
  }
}
function escapeHtml(text) {
  const map = {
    "&": "&",
    "<": "<",
    ">": ">",
    '"': '"',
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
async function marketplaceUI(req, env) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (path !== "/agents" && path !== "/agents/") {
    return new Response("Not Found", { status: 404 });
  }
  let agents = [];
  let apiAvailable = true;
  try {
    const agentsData = await getAllAgents4(env);
    agents = Object.values(agentsData);
  } catch (e) {
    apiAvailable = false;
  }
  agents.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  const agentCards = agents.map((agent) => `
    <div class="agent-card">
      <div class="agent-header">
        <h3>${escapeHtml(agent.name)}</h3>
        <span class="downloads">${agent.downloads || 0} installs</span>
      </div>
      <p class="description">${escapeHtml(agent.description || "No description")}</p>
      <div class="meta">
        <span class="author">by ${escapeHtml(agent.author || "unknown")}</span>
        ${agent.price ? `<span class="price">$${agent.price}</span>` : '<span class="free">Free</span>'}
      </div>
      <div class="commands">
        <strong>Commands:</strong>
        ${(agent.commands || []).map((cmd) => `<code>${escapeHtml(cmd.name)}</code>`).join(", ")}
      </div>
      <div class="cmd">
        <code>rina install ${escapeHtml(agent.name)}</code>
        <button onclick="copyCmd('rina install ${escapeHtml(agent.name)}')">Copy</button>
      </div>
    </div>
  `).join("");
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
      <a href="/" class="logo">\u{1F916} RinaWarp</a>
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
      <h1>\u{1F916} Agent Marketplace</h1>
      <p class="subtitle">Discover automation agents for your development workflow</p>
    </div>
    
    <div class="container">
      <div class="api-status ${apiAvailable ? "available" : "unavailable"}">
        <span>${apiAvailable ? "\u2713 Connected to marketplace" : "\u26A0 API not available"}</span>
        <span class="agent-count">${agents.length} agents</span>
      </div>
      
      ${agents.length > 0 ? `
      <div class="agents-grid">
        ${agentCards}
      </div>
      ` : '<p class="empty">No agents available yet. Be the first to publish!</p>'}
      
      <div class="cta">
        <h2>\u{1F680} Build Your Own Agent</h2>
        <p>Create and publish your own automation agent in minutes</p>
        <a href="/docs/agents">Get Started \u2192</a>
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
  <\/script>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}

// website/workers/router.ts
function rwHeaders(headers = new Headers()) {
  headers.set("Vary", "Accept-Encoding");
  return headers;
}
function rwText(status, message) {
  const headers = rwHeaders();
  headers.set("Content-Type", "text/plain; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=60, must-revalidate");
  return new Response(message, { status, headers });
}
function rwRedirect(location, status = 302) {
  const headers = rwHeaders();
  headers.set("Location", location);
  headers.set("Cache-Control", "public, max-age=60, must-revalidate");
  return new Response(null, { status, headers });
}
function normalizeArtifactKind(rawKind) {
  const kind = (rawKind || "").toLowerCase().trim();
  if (["linux", "terminal-pro-linux", "appimage"].includes(kind)) return "linux";
  if (["windows", "terminal-pro-windows", "exe", "win"].includes(kind)) return "windows";
  if (["mac", "macos", "terminal-pro-mac", "terminal-pro-macos", "dmg"].includes(kind)) return "mac";
  if (["checksums", "checksum", "sha256", "shasums", "shasums256.txt"].includes(kind)) return "checksums";
  return kind;
}
async function getReleaseManifest(env) {
  const object = await env.RINAWARP_CDN?.get("releases/latest.json");
  if (!object) return null;
  return JSON.parse(await object.text());
}
function pickArtifactPath(manifest, kind) {
  const version = manifest?.version;
  const explicitLinuxPath = manifest?.files?.linux?.path ?? null;
  const explicitWindowsPath = manifest?.files?.windows?.path ?? null;
  const explicitMacPath = manifest?.files?.mac?.path ?? manifest?.files?.macVariants?.dmg?.path ?? manifest?.files?.macVariants?.zip?.path ?? null;
  const explicitChecksumsPath = manifest?.files?.checksums?.path ?? null;
  const linuxPath = explicitLinuxPath ?? manifest?.platforms?.["linux-x86_64"]?.url ?? null;
  if (kind === "linux") return linuxPath;
  if (kind === "windows") return explicitWindowsPath;
  if (kind === "mac") return explicitMacPath;
  if (kind === "checksums" && explicitChecksumsPath) return explicitChecksumsPath;
  if (kind === "checksums" && version) return `releases/${version}/SHASUMS256.txt`;
  return null;
}
function toAbsoluteArtifactUrl(origin, artifactPath) {
  if (!artifactPath) return null;
  if (/^https?:\/\//i.test(artifactPath)) return artifactPath;
  return `${origin}/${artifactPath.replace(/^\/+/, "")}`;
}
function contentTypeFor(key) {
  const ext = key.slice(key.lastIndexOf("."));
  const contentTypes = {
    ".AppImage": "application/vnd.appimage",
    ".appimage": "application/vnd.appimage",
    ".deb": "application/vnd.debian.binary-package",
    ".exe": "application/x-msdownload",
    ".dmg": "application/x-apple-diskimage",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".zip": "application/zip"
  };
  return contentTypes[ext] || "application/octet-stream";
}
async function serveReleaseObject(env, objectKey) {
  const object = await env.RINAWARP_CDN?.get(objectKey);
  if (!object) return null;
  const headers = rwHeaders();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Content-Type", contentTypeFor(objectKey));
  if (objectKey === "releases/latest.json" || objectKey.endsWith("/latest.json")) {
    headers.set("Cache-Control", "public, max-age=60, must-revalidate");
  } else if (objectKey.startsWith("releases/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    headers.set("Cache-Control", "public, max-age=86400");
  }
  return new Response(object.body, { headers });
}
function renderHomepage() {
  const seo = injectSeoTags("/");
  const html = `<!DOCTYPE html>
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
    .hero { text-align: center; padding: 80px 20px; background: linear-gradient(180deg, #111 0%, #0a0a0a 100%); }
    .hero h1 { font-size: 3rem; margin-bottom: 16px; background: linear-gradient(90deg, #ff007f, #ff7f50, #00ffff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #888; font-size: 1.2rem; max-width: 600px; margin: 0 auto 32px; }
    .cta-buttons { display: flex; gap: 16px; justify-content: center; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.2s, opacity 0.2s; }
    .btn:hover { transform: translateY(-2px); }
    .btn-primary { background: linear-gradient(90deg, #ff007f, #ff7f50); color: white; }
    .btn-secondary { background: #222; color: white; border: 1px solid #333; }
    .features { max-width: 1100px; margin: 0 auto; padding: 60px 40px; }
    .features h2 { text-align: center; font-size: 2rem; margin-bottom: 40px; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .feature-card { background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; }
    .feature-card h3 { color: #ff007f; margin-bottom: 12px; font-size: 1.2rem; }
    .feature-card p { color: #888; line-height: 1.6; }
    .marketplace-preview { background: #111; border-top: 1px solid #222; padding: 60px 40px; text-align: center; }
    .marketplace-preview h2 { font-size: 2rem; margin-bottom: 16px; }
    .marketplace-preview p { color: #888; margin-bottom: 32px; }
    .agent-grid { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 32px; }
    .agent-badge { background: #222; border: 1px solid #333; padding: 12px 20px; border-radius: 8px; font-size: 0.9rem; }
    .agent-badge .price { color: #00ffff; font-weight: 600; }
    footer { background: #111; border-top: 1px solid #222; padding: 40px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="/" class="logo">\u{1F916} RinaWarp</a>
      <div class="nav-links">
        <a href="/" class="active">Home</a>
        <a href="/agents">Agents</a>
        <a href="/pricing">Pricing</a>
        <a href="/download">Download</a>
        <a href="/feedback">Feedback</a>
      </div>
    </nav>
  </header>
  
  <main>
    <section class="hero">
      <h1>AI-Powered Terminal for Developers</h1>
      <p class="subtitle">RinaWarp combines persistent AI agents with a powerful terminal. Automate workflows, run tests, and deploy apps - all from your terminal.</p>
      <div class="cta-buttons">
        <a href="/download" class="btn btn-primary">Download Now</a>
        <a href="/agents" class="btn btn-secondary">Browse Agents</a>
      </div>
    </section>
    
    <section class="features">
      <h2>Why RinaWarp?</h2>
      <div class="features-grid">
        <div class="feature-card">
          <h3>\u{1F916} AI Agents</h3>
          <p>Install and run AI agents directly in your terminal. From security audits to deployment helpers.</p>
        </div>
        <div class="feature-card">
          <h3>\u{1F512} Secure Execution</h3>
          <p>Every agent runs with explicit permissions. You're in control of what they can access.</p>
        </div>
        <div class="feature-card">
          <h3>\u{1F4B0} Marketplace</h3>
          <p>Discover free and paid agents. Publish your own and earn from your creations.</p>
        </div>
        <div class="feature-card">
          <h3>\u26A1 Fast & Lightweight</h3>
          <p>Built with Electron. Runs smoothly on macOS, Linux, and Windows.</p>
        </div>
      </div>
    </section>
    
    <section class="marketplace-preview">
      <h2>\u{1F680} Agent Marketplace</h2>
      <p>Supercharge your development workflow with pre-built agents</p>
      <div class="agent-grid">
        <div class="agent-badge">deploy-helper <span class="price">$5</span></div>
        <div class="agent-badge">security-audit <span class="price">$5</span></div>
        <div class="agent-badge">test-runner <span class="price">$4</span></div>
        <div class="agent-badge">docker-cleanup <span class="price">$3</span></div>
      </div>
      <a href="/agents" class="btn btn-primary">Explore Marketplace \u2192</a>
    </section>
  </main>
  
  <footer>
    <p>\xA9 2024 RinaWarp. Built with \u2764\uFE0F for developers.</p>
  </footer>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
function renderPricing() {
  const seo = injectSeoTags("/pricing");
  const html = `<!DOCTYPE html>
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
    .hero h1 { font-size: 2.5rem; margin-bottom: 12px; }
    .subtitle { color: #888; font-size: 1.1rem; }
    .container { max-width: 1000px; margin: 0 auto; padding: 60px 40px; }
    .plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .plan { background: #111; border: 1px solid #222; border-radius: 12px; padding: 32px; text-align: center; }
    .plan.featured { border-color: #ff007f; position: relative; }
    .plan.featured::before { content: 'Popular'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #ff007f; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; }
    .plan h2 { font-size: 1.5rem; margin-bottom: 8px; }
    .price { font-size: 2.5rem; font-weight: bold; margin: 16px 0; color: #00ffff; }
    .price span { font-size: 1rem; color: #666; }
    .price.lifetime { font-size: 1.8rem; }
    .features { list-style: none; text-align: left; margin: 24px 0; }
    .features li { padding: 8px 0; color: #aaa; }
    .features li::before { content: '\u2713'; color: #00ffff; margin-right: 8px; }
    .btn { display: block; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.2s; }
    .btn:hover { transform: translateY(-2px); }
    .btn-primary { background: linear-gradient(90deg, #ff007f, #ff7f50); color: white; }
    .btn-secondary { background: #222; color: white; border: 1px solid #333; }
    .lifetime-badge { display: inline-block; background: #14b8a6; color: #0a0a0a; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; margin-bottom: 8px; }
    footer { background: #111; border-top: 1px solid #222; padding: 40px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="/" class="logo">\u{1F916} RinaWarp</a>
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/agents">Agents</a>
        <a href="/pricing" class="active">Pricing</a>
        <a href="/download">Download</a>
        <a href="/feedback">Feedback</a>
      </div>
    </nav>
  </header>
  
  <main>
    <section class="hero">
      <h1>Simple, Transparent Pricing</h1>
      <p class="subtitle">Choose the plan that works for you</p>
    </section>
    
    <div class="container">
      <div class="plans">
        <div class="plan">
          <h2>Free</h2>
          <div class="price">$0<span>/month</span></div>
          <ul class="features">
            <li>Basic terminal features</li>
            <li>5 free agents</li>
            <li>Community support</li>
            <li>Standard security</li>
          </ul>
          <a href="/download" class="btn btn-secondary">Get Started</a>
        </div>
        
        <div class="plan featured">
          <h2>Pro</h2>
          <div class="price">$29<span>/month</span></div>
          <ul class="features">
            <li>All free features</li>
            <li>Unlimited agents</li>
            <li>Execute fixes</li>
            <li>High-impact actions</li>
            <li>Streaming execution</li>
            <li>Verification & audit exports</li>
            <li>Priority System Doctor</li>
          </ul>
          <a href="https://buy.stripe.com/3cI6oH2TYeZce7A7vJ0480h" class="btn btn-primary">Subscribe Now</a>
        </div>
        
        <div class="plan">
          <h2>Creator</h2>
          <div class="price">$69<span>/month</span></div>
          <ul class="features">
            <li>Everything in Pro</li>
            <li>Advanced workflows</li>
            <li>More execution context</li>
          </ul>
          <a href="https://buy.stripe.com/6oU28rcuy6sG3sWcQ30480i" class="btn btn-secondary">Subscribe</a>
        </div>

        <div class="plan">
          <h2>Team</h2>
          <div class="price">$99<span>/month</span></div>
          <ul class="features">
            <li>Everything in Creator</li>
            <li>Team-ready workflows</li>
            <li>Priority support</li>
          </ul>
          <a href="https://buy.stripe.com/fZu3cv8eicR48NgcQ30480j" class="btn btn-secondary">Subscribe</a>
        </div>

        <div class="plan">
          <span class="lifetime-badge">LIMITED</span>
          <h2>Founder Lifetime</h2>
          <div class="price lifetime">$699<span> one-time</span></div>
          <ul class="features">
            <li>Lifetime access</li>
            <li>All Pro features forever</li>
            <li>First 100 only</li>
            <li>Priority support</li>
          </ul>
          <a href="https://buy.stripe.com/bJe5kDgKObN0e7A7vJ0480k" class="btn btn-primary">Claim Now</a>
        </div>
      </div>
    </div>
  </main>
  
  <footer>
    <p>\xA9 2024 RinaWarp. Built with \u2764\uFE0F for developers.</p>
  </footer>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
function renderFeedback() {
  const seo = injectSeoTags("/feedback");
  const html = `<!DOCTYPE html>
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
    .nav-links a:hover { color: #ff007f; }
    .container { max-width: 600px; margin: 0 auto; padding: 60px 40px; }
    h1 { text-align: center; margin-bottom: 16px; }
    p { color: #888; text-align: center; margin-bottom: 32px; }
    form { background: #111; border: 1px solid #222; border-radius: 12px; padding: 32px; }
    label { display: block; margin-bottom: 8px; color: #aaa; }
    input, textarea, select { width: 100%; padding: 12px; margin-bottom: 16px; background: #222; border: 1px solid #333; border-radius: 8px; color: white; font-size: 1rem; }
    textarea { min-height: 120px; resize: vertical; }
    button { width: 100%; padding: 14px; background: linear-gradient(90deg, #ff007f, #ff7f50); color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
    button:hover { opacity: 0.9; }
    footer { background: #111; border-top: 1px solid #222; padding: 40px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="/" class="logo">\u{1F916} RinaWarp</a>
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/agents">Agents</a>
        <a href="/pricing">Pricing</a>
        <a href="/download">Download</a>
        <a href="/feedback" class="active">Feedback</a>
      </div>
    </nav>
  </header>
  
  <main>
    <div class="container">
      <h1>Send Us Feedback</h1>
      <p>We'd love to hear from you! Share your thoughts, suggestions, or report issues.</p>
      
      <form id="feedback-form">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" placeholder="Your name" required>
        
        <label for="email">Email</label>
        <input type="email" id="email" name="email" placeholder="your@email.com" required>
        
        <label for="rating">Rating</label>
        <select id="rating" name="rating">
          <option value="5">\u2B50\u2B50\u2B50\u2B50\u2B50 Excellent</option>
          <option value="4">\u2B50\u2B50\u2B50\u2B50 Good</option>
          <option value="3">\u2B50\u2B50\u2B50 Average</option>
          <option value="2">\u2B50\u2B50 Poor</option>
          <option value="1">\u2B50 Very Poor</option>
        </select>
        
        <label for="message">Your Feedback</label>
        <textarea id="message" name="message" placeholder="Tell us what you think..." required></textarea>
        
        <button type="submit">Send Feedback</button>
      </form>
    </div>
  </main>
  
  <footer>
    <p>\xA9 2024 RinaWarp. Built with \u2764\uFE0F for developers.</p>
  </footer>
  
  <script>
    document.getElementById('feedback-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          alert('Thank you for your feedback!');
          e.target.reset();
        } else {
          alert('Something went wrong. Please try again.');
        }
      } catch (err) {
        console.error('Feedback error:', err);
        alert('Thank you for your feedback!');
        e.target.reset();
      }
    });
  <\/script>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
function renderDownload() {
  const seo = injectSeoTags("/download");
  const html = `<!DOCTYPE html>
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
    .hero { text-align: center; padding: 80px 20px; background: linear-gradient(180deg, #111 0%, #0a0a0a 100%); }
    .hero h1 { font-size: 2.5rem; margin-bottom: 16px; }
    .version { display: inline-block; background: #14b8a6; color: #0a0a0a; padding: 4px 12px; border-radius: 12px; font-size: 0.9rem; font-weight: 600; margin-bottom: 16px; }
    .subtitle { color: #888; font-size: 1.1rem; max-width: 600px; margin: 0 auto 32px; }
    .container { max-width: 1000px; margin: 0 auto; padding: 60px 40px; }
    .platforms { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 48px; }
    .platform-card { background: #111; border: 1px solid #222; border-radius: 12px; padding: 32px; text-align: center; transition: transform 0.2s, border-color 0.2s; }
    .platform-card:hover { transform: translateY(-4px); border-color: #ff007f; }
    .platform-icon { font-size: 3rem; margin-bottom: 16px; }
    .platform-card h3 { font-size: 1.5rem; margin-bottom: 8px; }
    .platform-card p { color: #888; margin-bottom: 20px; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.2s, opacity 0.2s; }
    .btn:hover { transform: translateY(-2px); }
    .btn-primary { background: linear-gradient(90deg, #ff007f, #ff7f50); color: white; }
    .btn-secondary { background: #222; color: white; border: 1px solid #333; }
    .verification { background: #111; border: 1px solid #222; border-radius: 12px; padding: 32px; margin-top: 40px; }
    .verification h2 { font-size: 1.5rem; margin-bottom: 16px; color: #00ffff; }
    .verification p { color: #888; margin-bottom: 16px; line-height: 1.6; }
    .verification-links { display: flex; gap: 16px; flex-wrap: wrap; }
    .verification-links a { color: #ff007f; text-decoration: none; }
    .verification-links a:hover { text-decoration: underline; }
    .hash { background: #0a0a0a; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 0.85rem; color: #00ffff; overflow-x: auto; margin: 8px 0; }
    footer { background: #111; border-top: 1px solid #222; padding: 40px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <header>
    <nav role="navigation" aria-label="Main navigation">
      <a href="/" class="logo" aria-label="RinaWarp Home">\u{1F916} RinaWarp</a>
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/agents">Agents</a>
        <a href="/pricing">Pricing</a>
        <a href="/download" class="active" aria-current="page">Download</a>
        <a href="/feedback">Feedback</a>
      </div>
    </nav>
  </header>
  
  <main>
    <section class="hero" role="banner">
      <span class="version">Latest Release</span>
      <h1>Download RinaWarp Terminal Pro</h1>
      <p class="subtitle">The First AI You Can Trust to Actually Fix Things. Available for Linux, Windows, and macOS.</p>
    </section>
    
    <div class="container">
      <section class="platforms" aria-label="Download options by platform">
        <article class="platform-card">
          <div class="platform-icon" role="img" aria-label="Linux logo">\u{1F427}</div>
          <h3>Linux</h3>
          <p>AppImage (recommended) or .deb package</p>
          <a href="/download/linux" class="btn btn-primary" role="button" aria-label="Download for Linux">Download AppImage</a>
          <br><br>
          <a href="/releases/latest.json" class="btn btn-secondary" role="button" aria-label="View latest Linux release manifest">View Latest Manifest</a>
        </article>
        
        <article class="platform-card">
          <div class="platform-icon" role="img" aria-label="Windows logo">\u{1FA9F}</div>
          <h3>Windows</h3>
          <p>Windows Installer (.exe)</p>
          <a href="/download/windows" class="btn btn-primary" role="button" aria-label="Download for Windows">Download .exe</a>
        </article>
        
        <article class="platform-card">
          <div class="platform-icon" role="img" aria-label="Apple logo">\u{1F34E}</div>
          <h3>macOS</h3>
          <p>macOS Installer (.dmg) - coming soon after Apple signing is enabled</p>
          <a href="/download/mac" class="btn btn-secondary" role="button" aria-label="Download for macOS (Coming Soon)" aria-disabled="true">Check macOS availability</a>
        </article>
      </section>
      
      <section class="verification" aria-labelledby="verify-heading">
        <h2 id="verify-heading">\u{1F512} File Integrity Verification</h2>
        <p>For your security, we publish the latest manifest and SHA-256 checksums. Verify your download before running it.</p>
        
        <p><strong>SHA-256 Checksums:</strong></p>
        <div class="hash" aria-label="SHA-256 checksums">
Use the live checksum file and manifest below for the current release.</div>
        
        <p><strong>Verification Files:</strong></p>
        <div class="verification-links">
          <a href="/download/checksums" aria-label="Download SHA-256 checksums file">SHASUMS256.txt</a>
          <a href="/releases/latest.json" aria-label="View latest release manifest">latest.json</a>
        </div>
        
        <p style="margin-top: 16px;"><strong>To verify on Linux/macOS:</strong></p>
        <div class="hash" aria-label="Verification commands">
# Download the live checksum file
curl -O https://rinawarptech.com/download/checksums

# Inspect the live release manifest
curl https://rinawarptech.com/releases/latest.json

# Verify the file hash
sha256sum -c SHASUMS256.txt</div>
      </section>
    </div>
  </main>
  
  <footer role="contentinfo">
    <p>\xA9 2024 RinaWarp. Built with \u2764\uFE0F for developers.</p>
  </footer>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  });
}
var router_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, stripe-signature"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    if (path.startsWith("/api/")) {
      return handleApiRequest(request, env, path, corsHeaders);
    }
    if (path.startsWith("/download/")) {
      const manifest = await getReleaseManifest(env);
      if (!manifest) {
        return rwText(404, "latest.json not found");
      }
      const kind = normalizeArtifactKind(path.slice("/download/".length));
      const artifactPath = pickArtifactPath(manifest, kind);
      if (!artifactPath) {
        return rwText(404, "Artifact not available");
      }
      if (kind === "checksums") {
        const checksumObject = await env.RINAWARP_CDN?.get(artifactPath);
        if (!checksumObject) {
          return rwText(404, "Artifact not available");
        }
      }
      const location = toAbsoluteArtifactUrl(url.origin, artifactPath);
      if (!location) {
        return rwText(404, "Artifact not available");
      }
      return rwRedirect(location);
    }
    if (path.startsWith("/releases/")) {
      const response = await serveReleaseObject(env, path.slice(1));
      if (response) return response;
      return rwText(404, "Not found");
    }
    if (path === "/" || path === "") {
      return renderHomepage();
    }
    if (path === "/pricing" || path === "/pricing/") {
      return renderPricing();
    }
    if (path === "/feedback" || path === "/feedback/") {
      return renderFeedback();
    }
    if (path === "/download" || path === "/download/") {
      return renderDownload();
    }
    if ((path === "/api/feedback" || path === "/v1/feedback") && request.method === "POST") {
      return handleFeedbackSubmit(request, env, corsHeaders);
    }
    if (path.startsWith("/v1")) {
      return apiRouter(request, env);
    }
    if (path.startsWith("/agents")) {
      return marketplaceUI(request, env);
    }
    return fetch(request);
  }
};
async function handleApiRequest(request, env, path, corsHeaders) {
  if (path === "/api/health" && request.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  if (path === "/api/feedback" && request.method === "POST") {
    return handleFeedbackSubmit(request, env, corsHeaders);
  }
  if (path === "/api/events" && request.method === "POST") {
    try {
      const body = await request.json();
      console.log("Event received:", body);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
  if (path === "/api/me" && request.method === "GET") {
    return new Response(JSON.stringify({
      user: null,
      message: "Auth endpoint - implement with database"
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  if (path === "/api/portal" && request.method === "GET") {
    return new Response(JSON.stringify({
      url: "https://billing.stripe.com/p/login/test"
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  if (path === "/api/stripe/webhook" && request.method === "POST") {
    return handleStripeWebhook(request, env, corsHeaders);
  }
  if (path.startsWith("/api/license/")) {
    return handleLicenseRequest(request, env, corsHeaders, path);
  }
  if (path.startsWith("/api/auth/")) {
    return new Response(JSON.stringify({
      message: "Auth endpoint"
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  return new Response(JSON.stringify({ error: "Not found", path }), {
    status: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}
async function handleStripeWebhook(request, env, corsHeaders) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400, headers: corsHeaders });
  }
  if (env.STRIPE_WEBHOOK_SECRET) {
    const timestamp = request.headers.get("stripe-timestamp");
    const payload = await request.text();
    const expectedSignature = env.STRIPE_WEBHOOK_SECRET;
    console.log("Stripe signature received:", signature.substring(0, 20) + "...");
  }
  try {
    const payload = await request.text();
    const event = JSON.parse(payload);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerEmail = session.customer_details?.email || session.customer_email;
      console.log(`Payment completed: ${customerEmail}`);
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(`Webhook error: ${err.message}`, { status: 400, headers: corsHeaders });
  }
}
async function handleLicenseRequest(request, env, corsHeaders, path) {
  if (path === "/api/license/verify" && request.method === "POST") {
    try {
      const body = await request.json();
      return new Response(JSON.stringify({
        valid: true,
        tier: "free",
        message: "License verification endpoint"
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
  if (path === "/api/license/activate" && request.method === "POST") {
    return new Response(JSON.stringify({
      message: "License activation endpoint"
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}
async function handleFeedbackSubmit(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { name, email, rating, message } = body;
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    console.log("Feedback received:", { name, email, rating, message, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    if (env.SENDGRID_API_KEY) {
      try {
        const emailBody = {
          personalizations: [{
            to: [{ email: "support@rinawarptech.com" }],
            subject: `New Feedback: ${rating ? `\u2B50${rating}` : ""} from ${name}`
          }],
          from: { email: "noreply@rinawarptech.com", name: "RinaWarp Feedback" },
          content: [{
            type: "text/html",
            value: `
              <h2>New Feedback Received</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Rating:</strong> ${rating || "Not provided"}</p>
              <p><strong>Message:</strong></p>
              <p>${message}</p>
              <hr>
              <p><small>Submitted: ${(/* @__PURE__ */ new Date()).toISOString()}</small></p>
            `
          }]
        };
        const emailResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.SENDGRID_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(emailBody)
        });
        if (!emailResponse.ok) {
          console.error("SendGrid error:", await emailResponse.text());
        }
      } catch (emailErr) {
        console.error("Failed to send feedback email:", emailErr);
      }
    }
    return new Response(JSON.stringify({ success: true, message: "Feedback received" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// website/pages/_worker.ts
var DOWNLOADS_ORIGIN = "https://rinawarp-downloads.rinawarptech.workers.dev";
function toDownloadsUrl(requestUrl) {
  const url = new URL(requestUrl);
  return `${DOWNLOADS_ORIGIN}${url.pathname}${url.search}`;
}
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/download/") || url.pathname.startsWith("/releases/")) {
      return fetch(toDownloadsUrl(request.url), {
        method: request.method,
        headers: request.headers,
        body: request.method === "GET" || request.method === "HEAD" ? void 0 : request.body,
        redirect: "manual"
      });
    }
    return router_default.fetch(request, env, ctx);
  }
};
export {
  worker_default as default
};
