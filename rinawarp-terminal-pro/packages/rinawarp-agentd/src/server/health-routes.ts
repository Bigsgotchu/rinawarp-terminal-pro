import http from "node:http";
import { failoverDefaultRegion, getRegionHealth, getRegionMap, setRegionHealth } from "../platform/regions.js";
import { configureHealthProbes, getHealthProbesState, runHealthProbes } from "../platform/healthProbes.js";
import { reconcileTrafficManager } from "../platform/trafficManager.js";
import { readJson, sendJson } from "./response-helpers.js";

type Soc2Logger = (args: {
  req: http.IncomingMessage;
  workspaceId?: string;
  action: string;
  result: string;
  details?: Record<string, unknown>;
}) => void;

export async function handleHealthRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  deps: { logSoc2: Soc2Logger },
): Promise<boolean> {
  if (req.method === "GET" && url.pathname === "/v1/platform/regions") {
    sendJson(res, 200, getRegionMap());
    return true;
  }
  if (req.method === "GET" && url.pathname === "/v1/platform/regions/health") {
    sendJson(res, 200, { ok: true, health: getRegionHealth() });
    return true;
  }
  if (req.method === "PUT" && url.pathname === "/v1/platform/regions/health") {
    const body = (await readJson(req)) as { region?: string; status?: "healthy" | "degraded" | "down" } | null;
    const region = String(body?.region || "").trim();
    const status = body?.status;
    if (!region || !status) {
      sendJson(res, 400, { ok: false, error: "region and status are required" });
      return true;
    }
    const updated = setRegionHealth(region, status);
    if (!updated) {
      sendJson(res, 400, { ok: false, error: "invalid_region" });
      return true;
    }
    deps.logSoc2({ req, action: "region_health_set", result: "ok", details: updated as unknown as Record<string, unknown> });
    sendJson(res, 200, { ok: true, ...updated });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/v1/platform/regions/failover") {
    const out = failoverDefaultRegion();
    deps.logSoc2({ req, action: "region_failover", result: "ok", details: out as unknown as Record<string, unknown> });
    sendJson(res, 200, { ok: true, ...out });
    return true;
  }
  if (req.method === "PUT" && url.pathname === "/v1/platform/health-probes/config") {
    const body = (await readJson(req)) as {
      enabled?: boolean;
      auto_failover?: boolean;
      timeout_ms?: number;
      endpoints?: Partial<Record<"us-east-1" | "eu-west-1", string[]>>;
      probes?: Partial<Record<"us-east-1" | "eu-west-1", Array<string | { url: string; class?: "app" | "db" | "queue" | "control-plane"; weight?: number }>>>;
      policy?: {
        per_class_min_ratio?: Partial<Record<"app" | "db" | "queue" | "control-plane", number>>;
        consecutive_failures_for_degraded?: number;
        consecutive_failures_for_down?: number;
        consecutive_successes_for_healthy?: number;
        failover_cooldown_sec?: number;
      };
      discovery?: {
        enabled?: boolean;
        source?: "k8s-services";
        regions?: Partial<
          Record<
            "us-east-1" | "eu-west-1",
            Array<{
              namespace: string;
              label_selector?: string;
              path?: string;
              scheme?: "http" | "https";
              port_name?: string;
              class?: "app" | "db" | "queue" | "control-plane";
              weight?: number;
            }>
          >
        >;
      };
    } | null;
    const cfg = configureHealthProbes(body || {});
    deps.logSoc2({
      req,
      action: "health_probes_config_update",
      result: "ok",
      details: cfg as unknown as Record<string, unknown>,
    });
    sendJson(res, 200, { ok: true, config: cfg });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/v1/platform/health-probes/status") {
    sendJson(res, 200, { ok: true, config: getHealthProbesState() });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/v1/platform/health-probes/run") {
    const body = (await readJson(req)) as { force?: boolean } | null;
    const out = await runHealthProbes(body?.force === true);
    let trafficReconcile: { ok: boolean; changed?: boolean; error?: string } | undefined;
    if (out.ok && out.failover?.changed === true) {
      trafficReconcile = await reconcileTrafficManager(false);
    }
    deps.logSoc2({
      req,
      action: "health_probes_run",
      result: out.ok ? "ok" : "error",
      details: {
        ...(out as unknown as Record<string, unknown>),
        ...(trafficReconcile ? { traffic_reconcile: trafficReconcile } : {}),
      },
    });
    sendJson(res, out.ok ? 200 : 400, {
      ...out,
      ...(trafficReconcile ? { traffic_reconcile: trafficReconcile } : {}),
    });
    return true;
  }
  return false;
}
