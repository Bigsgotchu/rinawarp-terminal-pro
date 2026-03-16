/**
 * RinaWarp Marketplace API - Agents Handler
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

const defaultAgents: Record<string, AgentPackage> = {
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

async function getAllAgents(env: any): Promise<Record<string, AgentPackage>> {
  try {
    if (!env.AGENTS_KV) {
      return defaultAgents;
    }
    const agentsJson = await env.AGENTS_KV.get(AGENTS_KEY);
    if (agentsJson) {
      return JSON.parse(agentsJson);
    }
    // Initialize with defaults
    await env.AGENTS_KV.put(AGENTS_KEY, JSON.stringify(defaultAgents));
    return defaultAgents;
  } catch (e) {
    console.error('Error getting agents:', e);
    return defaultAgents;
  }
}

export async function listAgents(env: any): Promise<Response> {
  const agents = await getAllAgents(env);
  return new Response(JSON.stringify({ agents: Object.values(agents) }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function getAgent(name: string, env: any): Promise<Response> {
  const agents = await getAllAgents(env);
  const agent = agents[name];

  if (!agent) {
    return new Response(JSON.stringify({ error: "agent not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Increment downloads
  const updatedAgent = { ...agent, downloads: (agent.downloads || 0) + 1 };
  agents[name] = updatedAgent;
  
  try {
    await env.AGENTS_KV.put(AGENTS_KEY, JSON.stringify(agents));
  } catch (e) {
    console.error('Error updating downloads:', e);
  }

  return new Response(JSON.stringify(updatedAgent), {
    headers: { "Content-Type": "application/json" }
  });
}
