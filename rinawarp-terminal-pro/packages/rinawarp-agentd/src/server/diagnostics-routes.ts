import http from "node:http";
import { isPidAlive, paths, readPid, readState, readTaskRegistry } from "../daemon/state.js";
import { sendJson } from "./response-helpers.js";

type Metrics = {
  runs_total: number;
  runs_completed: number;
  runs_failed: number;
  runs_cancelled: number;
  interventions_total: number;
  confirmation_denied_total: number;
  failure_classes: Record<string, number>;
  duration_ms_total: number;
  unblock_runs: number;
  unblock_duration_ms_total: number;
};

export async function handleDiagnosticsRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  deps: { metrics: Metrics },
): Promise<boolean> {
  if (req.method === "GET" && url.pathname === "/v1/metrics") {
    const { metrics } = deps;
    const completedOrFailed = metrics.runs_completed + metrics.runs_failed;
    const completionRate = completedOrFailed === 0 ? 0 : metrics.runs_completed / completedOrFailed;
    const avgDurationMs = metrics.runs_total === 0 ? 0 : Math.round(metrics.duration_ms_total / metrics.runs_total);
    const mttrUnblockMs = metrics.unblock_runs === 0 ? 0 : Math.round(metrics.unblock_duration_ms_total / metrics.unblock_runs);
    sendJson(res, 200, {
      ok: true,
      metrics: {
        ...metrics,
        completion_rate: completionRate,
        avg_duration_ms: avgDurationMs,
        mttr_unblock_ms: mttrUnblockMs,
      },
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/v1/daemon/status") {
    const state = readState();
    const pid = readPid();
    const running = !!(pid && isPidAlive(pid));
    const registry = readTaskRegistry();
    const counts = registry.tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      if (task.deadLetter) acc.dead_letter = (acc.dead_letter ?? 0) + 1;
      return acc;
    }, {});
    sendJson(res, 200, {
      ok: true,
      daemon: {
        running,
        pid: running ? pid : null,
        startedAt: state?.startedAt ?? null,
        updatedAt: state?.updatedAt ?? null,
        storeDir: paths().baseDir,
      },
      tasks: {
        total: registry.tasks.length,
        counts,
      },
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/v1/daemon/tasks") {
    const status = url.searchParams.get("status");
    const deadOnly = url.searchParams.get("deadLetter") === "1";
    const registry = readTaskRegistry();
    const tasks = registry.tasks.filter((task) => {
      if (status && task.status !== status) return false;
      if (deadOnly && task.deadLetter !== true) return false;
      return true;
    });
    sendJson(res, 200, { ok: true, tasks, updatedAt: registry.updatedAt });
    return true;
  }

  return false;
}
