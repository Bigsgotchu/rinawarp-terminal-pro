import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../daemon/state.js";

export type WorkflowTemplateParam = {
  name: string;
  required: boolean;
  default_value?: string;
  description?: string;
};

export type WorkflowTemplateStep = {
  id: string;
  command: string;
  cwd?: string;
};

export type WorkflowTemplateRecord = {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  parameters: WorkflowTemplateParam[];
  steps: WorkflowTemplateStep[];
  archived: boolean;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

type WorkflowTemplateRegistry = {
  version: 1;
  templates: WorkflowTemplateRecord[];
  updated_at: string;
};

function stateFile(): string {
  return path.join(paths().baseDir, "workflow-templates.json");
}

function defaultRegistry(): WorkflowTemplateRegistry {
  return { version: 1, templates: [], updated_at: new Date().toISOString() };
}

function readRegistry(): WorkflowTemplateRegistry {
  const fp = stateFile();
  if (!fs.existsSync(fp)) return defaultRegistry();
  try {
    const raw = fs.readFileSync(fp, "utf8");
    const parsed = JSON.parse(raw) as WorkflowTemplateRegistry;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.templates)) return defaultRegistry();
    return parsed;
  } catch {
    return defaultRegistry();
  }
}

function writeRegistry(next: WorkflowTemplateRegistry): void {
  const fp = stateFile();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

function normalizeParams(input: Array<Partial<WorkflowTemplateParam>> | undefined): WorkflowTemplateParam[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((p) => ({
      name: String(p?.name || "").trim(),
      required: p?.required === true,
      ...(p?.default_value ? { default_value: String(p.default_value) } : {}),
      ...(p?.description ? { description: String(p.description) } : {}),
    }))
    .filter((p) => p.name.length > 0);
}

function normalizeSteps(input: Array<Partial<WorkflowTemplateStep>> | undefined): WorkflowTemplateStep[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((s, i) => ({
      id: String(s?.id || `step_${i + 1}`).trim(),
      command: String(s?.command || "").trim(),
      ...(s?.cwd ? { cwd: String(s.cwd) } : {}),
    }))
    .filter((s) => s.command.length > 0);
}

export function createWorkflowTemplate(input: {
  workspace_id: string;
  name: string;
  description?: string;
  parameters?: Array<Partial<WorkflowTemplateParam>>;
  steps?: Array<Partial<WorkflowTemplateStep>>;
  actor_id: string;
}): WorkflowTemplateRecord {
  const now = new Date().toISOString();
  const registry = readRegistry();
  const next: WorkflowTemplateRecord = {
    id: `wt_${randomUUID()}`,
    workspace_id: String(input.workspace_id || "").trim(),
    name: String(input.name || "").trim() || "untitled-template",
    ...(input.description ? { description: String(input.description) } : {}),
    parameters: normalizeParams(input.parameters),
    steps: normalizeSteps(input.steps),
    archived: false,
    version: 1,
    created_by: input.actor_id,
    updated_by: input.actor_id,
    created_at: now,
    updated_at: now,
  };
  registry.templates.push(next);
  registry.updated_at = now;
  writeRegistry(registry);
  return next;
}

export function listWorkflowTemplates(args: {
  workspace_id: string;
  archived?: boolean;
  limit?: number;
}): WorkflowTemplateRecord[] {
  const registry = readRegistry();
  const limit = Number.isFinite(args.limit) ? Math.max(1, Math.min(500, Number(args.limit))) : 200;
  return registry.templates
    .filter((tpl) => tpl.workspace_id === args.workspace_id)
    .filter((tpl) => (typeof args.archived === "boolean" ? tpl.archived === args.archived : true))
    .slice(-limit)
    .reverse();
}

export function getWorkflowTemplate(id: string): WorkflowTemplateRecord | null {
  const key = String(id || "").trim();
  if (!key) return null;
  const registry = readRegistry();
  return registry.templates.find((tpl) => tpl.id === key) || null;
}

export function updateWorkflowTemplate(input: {
  id: string;
  actor_id: string;
  name?: string;
  description?: string;
  parameters?: Array<Partial<WorkflowTemplateParam>>;
  steps?: Array<Partial<WorkflowTemplateStep>>;
  archived?: boolean;
}): WorkflowTemplateRecord | null {
  const key = String(input.id || "").trim();
  if (!key) return null;
  const registry = readRegistry();
  const idx = registry.templates.findIndex((tpl) => tpl.id === key);
  if (idx < 0) return null;
  const curr = registry.templates[idx];
  const now = new Date().toISOString();
  const next: WorkflowTemplateRecord = {
    ...curr,
    ...(input.name ? { name: String(input.name).trim() || curr.name } : {}),
    ...(input.description ? { description: String(input.description) } : {}),
    ...(Array.isArray(input.parameters) ? { parameters: normalizeParams(input.parameters) } : {}),
    ...(Array.isArray(input.steps) ? { steps: normalizeSteps(input.steps) } : {}),
    ...(typeof input.archived === "boolean" ? { archived: input.archived } : {}),
    version: curr.version + 1,
    updated_by: input.actor_id,
    updated_at: now,
  };
  registry.templates[idx] = next;
  registry.updated_at = now;
  writeRegistry(registry);
  return next;
}

function interpolate(input: string, vars: Record<string, string>): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g, (_m, key) => vars[String(key)] || "");
}

export function runWorkflowTemplate(input: {
  id: string;
  parameters?: Record<string, string>;
}): { ok: true; template: WorkflowTemplateRecord; resolved_steps: WorkflowTemplateStep[] } | { ok: false; error: string; missing?: string[] } {
  const tpl = getWorkflowTemplate(input.id);
  if (!tpl) return { ok: false, error: "template_not_found" };
  if (tpl.archived) return { ok: false, error: "template_archived" };

  const provided: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.parameters || {})) {
    provided[String(k)] = String(v ?? "");
  }
  for (const p of tpl.parameters) {
    if (!provided[p.name] && p.default_value) provided[p.name] = p.default_value;
  }
  const missing = tpl.parameters.filter((p) => p.required && !provided[p.name]).map((p) => p.name);
  if (missing.length > 0) return { ok: false, error: "missing_required_parameters", missing };

  const resolved = tpl.steps.map((step) => ({
    ...step,
    command: interpolate(step.command, provided),
    ...(step.cwd ? { cwd: interpolate(step.cwd, provided) } : {}),
  }));
  return { ok: true, template: tpl, resolved_steps: resolved };
}
