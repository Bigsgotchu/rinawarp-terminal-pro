import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../daemon/state.js";

type RetrievalMode = "index" | "grep";

type RetrievalState = {
  version: 1;
  mode: RetrievalMode;
  updated_at: string;
  last_benchmark_at?: string;
  last_benchmark_ms?: number;
};

function stateFile(): string {
  return path.join(paths().baseDir, "retrieval-state.json");
}

function defaultState(): RetrievalState {
  return {
    version: 1,
    mode: "grep",
    updated_at: new Date().toISOString(),
  };
}

function readState(): RetrievalState {
  const fp = stateFile();
  if (!fs.existsSync(fp)) return defaultState();
  try {
    const raw = fs.readFileSync(fp, "utf8");
    const parsed = JSON.parse(raw) as RetrievalState;
    if (!parsed || parsed.version !== 1) return defaultState();
    return {
      version: 1,
      mode: parsed.mode === "index" ? "index" : "grep",
      updated_at: String(parsed.updated_at || new Date().toISOString()),
      ...(Number.isFinite(parsed.last_benchmark_ms) ? { last_benchmark_ms: Number(parsed.last_benchmark_ms) } : {}),
      ...(parsed.last_benchmark_at ? { last_benchmark_at: String(parsed.last_benchmark_at) } : {}),
    };
  } catch {
    return defaultState();
  }
}

function writeState(next: RetrievalState): void {
  const fp = stateFile();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export function configureRetrieval(input: { mode?: RetrievalMode }): RetrievalState {
  const current = readState();
  const next: RetrievalState = {
    ...current,
    ...(input.mode ? { mode: input.mode } : {}),
    updated_at: new Date().toISOString(),
  };
  writeState(next);
  return next;
}

export function getRetrievalState(): RetrievalState {
  return readState();
}

export function runRetrievalBenchmark(args: {
  query: string;
  repo_path: string;
  limit?: number;
}): {
  ok: boolean;
  mode: RetrievalMode;
  latency_ms: number;
  result_count: number;
  sample: Array<{ file: string; line: number; text: string }>;
  error?: string;
} {
  const state = readState();
  const query = String(args.query || "").trim();
  const repoPath = String(args.repo_path || "").trim();
  const limit = Number.isFinite(args.limit) ? Math.max(1, Math.min(200, Number(args.limit))) : 20;
  if (!query || !repoPath) {
    return { ok: false, mode: state.mode, latency_ms: 0, result_count: 0, sample: [], error: "query and repo_path are required" };
  }
  const t0 = process.hrtime.bigint();
  const cmd = state.mode === "index" ? "rg" : "rg";
  const proc = spawnSync(cmd, ["--no-heading", "--line-number", "-S", query, repoPath], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  const latencyMs = Number(process.hrtime.bigint() - t0) / 1_000_000;
  if (proc.error) {
    const next = { ...state, last_benchmark_at: new Date().toISOString(), last_benchmark_ms: latencyMs };
    writeState(next);
    return {
      ok: false,
      mode: state.mode,
      latency_ms: latencyMs,
      result_count: 0,
      sample: [],
      error: proc.error.message,
    };
  }
  const lines = String(proc.stdout || "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const sample = lines.slice(0, limit).map((line) => {
    const m = line.match(/^(.*?):(\d+):(.*)$/);
    if (!m) return { file: "", line: 0, text: line };
    return {
      file: m[1],
      line: Number(m[2] || 0),
      text: String(m[3] || "").trim(),
    };
  });
  const next = { ...state, last_benchmark_at: new Date().toISOString(), last_benchmark_ms: latencyMs };
  writeState(next);
  return {
    ok: true,
    mode: state.mode,
    latency_ms: latencyMs,
    result_count: lines.length,
    sample,
  };
}
