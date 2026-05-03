import http from "node:http";
import { configureRetrieval, getRetrievalState, runRetrievalBenchmark } from "../platform/retrieval.js";
import { readJson, sendJson } from "./response-helpers.js";

type Soc2Logger = (args: {
  req: http.IncomingMessage;
  workspaceId?: string;
  action: string;
  result: string;
  details?: Record<string, unknown>;
}) => void;

export async function handleSearchRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  deps: { logSoc2: Soc2Logger },
): Promise<boolean> {
  if (req.method === "PUT" && url.pathname === "/v1/platform/retrieval/config") {
    const body = (await readJson(req)) as { mode?: "index" | "grep" } | null;
    const cfg = configureRetrieval({
      ...(body?.mode ? { mode: body.mode } : {}),
    });
    deps.logSoc2({
      req,
      action: "retrieval_config_update",
      result: "ok",
      details: cfg as unknown as Record<string, unknown>,
    });
    sendJson(res, 200, { ok: true, config: cfg });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/v1/platform/retrieval/status") {
    sendJson(res, 200, { ok: true, config: getRetrievalState() });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/v1/platform/retrieval/benchmark") {
    const body = (await readJson(req)) as { query?: string; repo_path?: string; limit?: number } | null;
    const out = runRetrievalBenchmark({
      query: String(body?.query || ""),
      repo_path: String(body?.repo_path || ""),
      ...(Number.isFinite(body?.limit) ? { limit: Number(body?.limit) } : {}),
    });
    deps.logSoc2({
      req,
      action: "retrieval_benchmark_run",
      result: out.ok ? "ok" : "error",
      details: out as unknown as Record<string, unknown>,
    });
    sendJson(res, out.ok ? 200 : 400, out);
    return true;
  }

  return false;
}
