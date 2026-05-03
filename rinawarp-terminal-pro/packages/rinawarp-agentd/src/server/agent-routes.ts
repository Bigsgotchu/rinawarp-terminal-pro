import http from "node:http";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { normalizeProjectRoot } from "../projectRoot.js";
import type { AgentPlan, AgentPlanRequest, PlanStep, Risk } from "../types.js";
import { readJson, sendJson } from "./response-helpers.js";

function expectedSafety(risk: Risk): Pick<PlanStep, "risk_level" | "requires_confirmation"> {
  if (risk === "high-impact") {
    return { risk_level: "high", requires_confirmation: true };
  }
  if (risk === "safe-write") {
    return { risk_level: "medium", requires_confirmation: false };
  }
  return { risk_level: "low", requires_confirmation: false };
}

function validatePlanStep(step: PlanStep, index: number): string[] {
  const errors: string[] = [];
  const prefix = `plan[${index}]`;
  const allowedRisks: Risk[] = ["inspect", "safe-write", "high-impact"];
  if (!allowedRisks.includes(step.risk)) {
    errors.push(`${prefix}.risk must be one of: inspect, safe-write, high-impact`);
    return errors;
  }
  const expected = expectedSafety(step.risk);

  if (!step.stepId?.trim()) errors.push(`${prefix}.stepId is required`);
  if (!step.description?.trim()) errors.push(`${prefix}.description is required`);
  if (step.tool !== "terminal.write") errors.push(`${prefix}.tool must be terminal.write`);
  if (!step.input?.command?.trim()) errors.push(`${prefix}.input.command is required`);
  if (step.risk_level !== expected.risk_level) {
    errors.push(`${prefix}.risk_level must be ${expected.risk_level} for risk=${step.risk}`);
  }
  if (step.requires_confirmation !== expected.requires_confirmation) {
    errors.push(`${prefix}.requires_confirmation must be ${String(expected.requires_confirmation)} for risk=${step.risk}`);
  }
  if (!step.verification_plan || !Array.isArray(step.verification_plan.steps)) {
    errors.push(`${prefix}.verification_plan.steps must be an array`);
  }
  if (step.requires_confirmation && !step.confirmationScope?.trim()) {
    errors.push(`${prefix}.confirmationScope is required when requires_confirmation=true`);
  }

  return errors;
}

export function validatePlanForExecution(plan: PlanStep[]): string[] {
  if (!Array.isArray(plan) || plan.length === 0) {
    return ["plan must contain at least one step"];
  }
  const errors: string[] = [];
  for (let i = 0; i < plan.length; i++) {
    errors.push(...validatePlanStep(plan[i], i));
  }
  return errors;
}

type PlannerContext = {
  cwd: string;
  git: string;
  packageManager: string;
  repoKind: "node" | "python" | "rust" | "go" | "unknown";
  files: string[];
};

function detectPackageManager(projectRoot: string): "pnpm" | "npm" | "yarn" {
  if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) return "yarn";
  return "npm";
}

function detectRepoKind(projectRoot: string): PlannerContext["repoKind"] {
  const has = (file: string) => fs.existsSync(path.join(projectRoot, file));
  if (has("package.json")) return "node";
  if (has("pyproject.toml") || has("requirements.txt")) return "python";
  if (has("Cargo.toml")) return "rust";
  if (has("go.mod")) return "go";
  return "unknown";
}

function listImportantFiles(projectRoot: string): string[] {
  const preferred = [
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "tsconfig.json",
    "README.md",
    "pyproject.toml",
    "requirements.txt",
    "Cargo.toml",
    "go.mod",
    "Makefile",
  ];
  const present = preferred.filter((file) => fs.existsSync(path.join(projectRoot, file)));
  try {
    const topLevel = fs.readdirSync(projectRoot, { withFileTypes: true })
      .slice(0, 32)
      .map((entry) => `${entry.isDirectory() ? "dir" : "file"}:${entry.name}`);
    return Array.from(new Set([...present, ...topLevel])).slice(0, 20);
  } catch {
    return present;
  }
}

async function safeShell(command: string, cwd: string, timeoutMs = 5000): Promise<string> {
  const shell = process.platform === "win32" ? "cmd.exe" : "bash";
  const shellArg = process.platform === "win32" ? "/c" : "-lc";
  return await new Promise((resolve) => {
    const child = spawn(shell, [shellArg, command], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    child.on("close", () => {
      clearTimeout(timer);
      const combined = `${stdout}\n${stderr}`.trim();
      resolve(combined || "(no output)");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve(`Error: ${error.message}`);
    });
  });
}

async function collectPlannerContext(projectRoot: string): Promise<PlannerContext> {
  return {
    cwd: projectRoot,
    git: await safeShell("git status --porcelain -b", projectRoot),
    packageManager: detectPackageManager(projectRoot),
    repoKind: detectRepoKind(projectRoot),
    files: listImportantFiles(projectRoot),
  };
}

function planStepFromCommand(command: string, projectRoot: string, index: number): PlanStep {
  const trimmed = String(command || "").trim();
  const risk: Risk =
    /\b(rm\s+-rf|sudo|chmod\s+777|killall|mkfs|dd\s+if=|shutdown|reboot)\b/i.test(trimmed)
      ? "high-impact"
      : /\b(install|update|upgrade|delete|remove|prune|migrate|restart)\b/i.test(trimmed)
        ? "safe-write"
        : "inspect";
  const safety = expectedSafety(risk);
  return {
    stepId: `step_${index + 1}`,
    description: `Run: ${trimmed}`,
    tool: "terminal.write",
    input: {
      command: trimmed,
      cwd: projectRoot,
      timeoutMs: 60_000,
      stepId: `step_${index + 1}`,
    },
    risk,
    risk_level: safety.risk_level,
    requires_confirmation: safety.requires_confirmation,
    verification_plan: { steps: [] },
    ...(risk === "high-impact" ? { confirmationScope: trimmed } : {}),
  };
}

function buildFixThisRepoSteps(projectRoot: string, context: PlannerContext): string[] {
  const pm = context.packageManager;
  if (context.repoKind === "node") {
    const commands = ["git status --short --branch"];
    commands.push(pm === "pnpm" ? "pnpm install --frozen-lockfile || pnpm install" : pm === "yarn" ? "yarn install --immutable || yarn install" : "npm install");
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")) as { scripts?: Record<string, string> };
      if (pkg.scripts?.build) commands.push(pm === "pnpm" ? "pnpm run build" : `${pm} run build`);
      if (pkg.scripts?.test) commands.push(pm === "pnpm" ? "pnpm test" : `${pm} test`);
    } catch {
      // Ignore malformed package.json and keep the deterministic base path.
    }
    return commands;
  }
  if (context.repoKind === "python") {
    return [
      "git status --short --branch",
      ...(fs.existsSync(path.join(projectRoot, "requirements.txt")) ? ["python -m pip install -r requirements.txt"] : []),
      "python -m pytest",
    ];
  }
  if (context.repoKind === "rust") return ["git status --short --branch", "cargo build", "cargo test"];
  if (context.repoKind === "go") return ["git status --short --branch", "go test ./..."];
  return ["git status --short --branch", "ls -la"];
}

async function callPlannerModel(prompt: string): Promise<string[] | null> {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const model = String(process.env.RINAWARP_OPENAI_MODEL || "gpt-4o-mini").trim();
  if (!apiKey) return null;
  const response = await fetch(String(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a precise terminal planner." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) return null;
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const raw = String(payload.choices?.[0]?.message?.content || "").trim();
  try {
    const parsed = JSON.parse(raw) as { steps?: string[] };
    const steps = Array.isArray(parsed.steps) ? parsed.steps.map((step) => String(step || "").trim()).filter(Boolean) : [];
    return steps.slice(0, 3);
  } catch {
    return null;
  }
}

function makeFallbackPlan(intentText: string, projectRoot: string): AgentPlan {
  const planId = randomUUID();
  const steps: PlanStep[] = [
    {
      stepId: "inspect:git",
      description: "Inspect git working tree state",
      tool: "terminal.write",
      input: { command: "git status", cwd: projectRoot, timeoutMs: 60_000, stepId: "inspect:git" },
      risk: "inspect",
      risk_level: "low",
      requires_confirmation: false,
      verification_plan: { steps: [] }
    },
    {
      stepId: "build",
      description: "Run project build command",
      tool: "terminal.write",
      input: { command: "npm -v && npm run build", cwd: projectRoot, timeoutMs: 60_000, stepId: "build" },
      risk: "safe-write",
      risk_level: "medium",
      requires_confirmation: false,
      verification_plan: { steps: [] }
    }
  ];

  return {
    planId,
    intentText,
    projectRoot,
    reasoning: `I'll inspect repo state then run the build and report failures.`,
    steps
  };
}

async function makePlan(intentText: string, projectRoot: string): Promise<AgentPlan> {
  const context = await collectPlannerContext(projectRoot);
  const trimmedIntent = String(intentText || "").trim();
  const lowered = trimmedIntent.toLowerCase();
  const goldenSteps = lowered.includes("fix this repo") ? buildFixThisRepoSteps(projectRoot, context) : null;
  const prompt = [
    "Break this task into 1-3 terminal commands.",
    'Return JSON only in the form {"steps":["command 1","command 2"]}.',
    "Only suggest commands that are likely to work in the described repo.",
    `Task: ${trimmedIntent}`,
    `Context: ${JSON.stringify(context)}`,
  ].join("\n");
  let commands = goldenSteps;
  if (!commands) {
    const planned = await callPlannerModel(prompt);
    commands = planned && planned.length ? planned : null;
  }
  if (!commands || !commands.length) {
    return makeFallbackPlan(intentText, projectRoot);
  }
  return {
    planId: randomUUID(),
    intentText,
    projectRoot,
    reasoning: goldenSteps
      ? "I will inspect repo state first, then run the most likely dependency/build/test recovery path for this repository."
      : "I broke the task into the smallest likely-to-work terminal steps for this repo.",
    steps: commands.map((command, index) => planStepFromCommand(command, projectRoot, index)),
  };
}

export async function handleAgentRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<boolean> {
  if (req.method === "POST" && url.pathname === "/v1/plan") {
    const body = (await readJson(req)) as AgentPlanRequest;
    if (!body?.intentText?.trim()) {
      sendJson(res, 400, { ok: false, error: "intentText is required" });
      return true;
    }
    if (!body?.projectRoot?.trim()) {
      sendJson(res, 400, { ok: false, error: "projectRoot is required" });
      return true;
    }
    const projectRoot = normalizeProjectRoot(body.projectRoot);
    const plan = await makePlan(body.intentText, projectRoot);
    const validationErrors = validatePlanForExecution(plan.steps);
    if (validationErrors.length > 0) {
      sendJson(res, 500, { ok: false, error: `planner produced invalid safety contract: ${validationErrors.join("; ")}` });
      return true;
    }
    sendJson(res, 200, { ok: true, plan });
    return true;
  }

  return false;
}
