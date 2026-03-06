import { failoverDefaultRegion, getRegionHealth, setRegionHealth } from "./regions.js";

type RegionId = "us-east-1" | "eu-west-1";
type ProbeClass = "app" | "db" | "queue" | "control-plane";

type ProbeDef = {
  url: string;
  class: ProbeClass;
  weight: number;
};

type ProbeThresholdPolicy = {
  per_class_min_ratio: Record<ProbeClass, number>;
  consecutive_failures_for_degraded: number;
  consecutive_failures_for_down: number;
  consecutive_successes_for_healthy: number;
  failover_cooldown_sec: number;
};

type ProbeThresholdPolicyInput = {
  per_class_min_ratio?: Partial<Record<ProbeClass, number>>;
  consecutive_failures_for_degraded?: number;
  consecutive_failures_for_down?: number;
  consecutive_successes_for_healthy?: number;
  failover_cooldown_sec?: number;
};

type DiscoveryRule = {
  namespace: string;
  label_selector?: string;
  path?: string;
  scheme?: "http" | "https";
  port_name?: string;
  class?: ProbeClass;
  weight?: number;
};

type DiscoveryConfig = {
  enabled: boolean;
  source: "k8s-services";
  regions: Record<RegionId, DiscoveryRule[]>;
};

type RegionRuntimeState = {
  consecutive_failures: number;
  consecutive_successes: number;
};

type HealthProbeState = {
  version: 1;
  enabled: boolean;
  auto_failover: boolean;
  timeout_ms: number;
  probes: Record<RegionId, ProbeDef[]>;
  policy: ProbeThresholdPolicy;
  discovery: DiscoveryConfig;
  runtime: Record<RegionId, RegionRuntimeState>;
  last_failover_at?: string;
  last_run_at?: string;
  last_result?: "ok" | "error";
};

const state: HealthProbeState = {
  version: 1,
  enabled: false,
  auto_failover: false,
  timeout_ms: 2_000,
  probes: {
    "us-east-1": [],
    "eu-west-1": [],
  },
  policy: {
    per_class_min_ratio: {
      app: 1,
      db: 1,
      queue: 0.5,
      "control-plane": 1,
    },
    consecutive_failures_for_degraded: 1,
    consecutive_failures_for_down: 2,
    consecutive_successes_for_healthy: 2,
    failover_cooldown_sec: 300,
  },
  discovery: {
    enabled: false,
    source: "k8s-services",
    regions: {
      "us-east-1": [],
      "eu-west-1": [],
    },
  },
  runtime: {
    "us-east-1": { consecutive_failures: 0, consecutive_successes: 0 },
    "eu-west-1": { consecutive_failures: 0, consecutive_successes: 0 },
  },
};

function normalizeClass(input: unknown): ProbeClass {
  const raw = String(input || "app").trim().toLowerCase();
  if (raw === "db") return "db";
  if (raw === "queue") return "queue";
  if (raw === "control-plane") return "control-plane";
  return "app";
}

function normalizeScheme(input: unknown): "http" | "https" {
  return String(input || "").trim().toLowerCase() === "https" ? "https" : "http";
}

function normalizeProbeList(input: unknown): ProbeDef[] {
  if (!Array.isArray(input)) return [];
  const out: ProbeDef[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      const url = item.trim();
      if (url) out.push({ url, class: "app", weight: 1 });
      continue;
    }
    const rec = item as { url?: unknown; class?: unknown; weight?: unknown };
    const url = String(rec?.url || "").trim();
    if (!url) continue;
    const probeClass = normalizeClass(rec?.class);
    const weight = Number.isFinite(Number(rec?.weight)) ? Math.max(0.1, Number(rec?.weight)) : 1;
    out.push({ url, class: probeClass, weight });
  }
  return out;
}

function boundedRatio(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

export function configureHealthProbes(args: {
  enabled?: boolean;
  auto_failover?: boolean;
  timeout_ms?: number;
  endpoints?: Partial<Record<RegionId, string[]>>;
  probes?: Partial<Record<RegionId, Array<string | { url: string; class?: ProbeClass; weight?: number }>>>;
  policy?: ProbeThresholdPolicyInput;
  discovery?: {
    enabled?: boolean;
    source?: "k8s-services";
    regions?: Partial<Record<RegionId, DiscoveryRule[]>>;
  };
}) {
  if (typeof args.enabled === "boolean") state.enabled = args.enabled;
  if (typeof args.auto_failover === "boolean") state.auto_failover = args.auto_failover;
  if (Number.isFinite(args.timeout_ms)) state.timeout_ms = Math.max(250, Number(args.timeout_ms));

  // Backward-compatible endpoint input (string[]).
  if (args.endpoints) {
    if (Array.isArray(args.endpoints["us-east-1"])) {
      state.probes["us-east-1"] = normalizeProbeList(args.endpoints["us-east-1"] || []);
    }
    if (Array.isArray(args.endpoints["eu-west-1"])) {
      state.probes["eu-west-1"] = normalizeProbeList(args.endpoints["eu-west-1"] || []);
    }
  }
  if (args.probes) {
    if (Array.isArray(args.probes["us-east-1"])) {
      state.probes["us-east-1"] = normalizeProbeList(args.probes["us-east-1"] || []);
    }
    if (Array.isArray(args.probes["eu-west-1"])) {
      state.probes["eu-west-1"] = normalizeProbeList(args.probes["eu-west-1"] || []);
    }
  }

  const p = args.policy || {};
  if (p.per_class_min_ratio) {
    state.policy.per_class_min_ratio = {
      app: boundedRatio(p.per_class_min_ratio.app ?? state.policy.per_class_min_ratio.app),
      db: boundedRatio(p.per_class_min_ratio.db ?? state.policy.per_class_min_ratio.db),
      queue: boundedRatio(p.per_class_min_ratio.queue ?? state.policy.per_class_min_ratio.queue),
      "control-plane": boundedRatio(
        p.per_class_min_ratio["control-plane"] ?? state.policy.per_class_min_ratio["control-plane"],
      ),
    };
  }
  if (Number.isFinite(p.consecutive_failures_for_degraded)) {
    state.policy.consecutive_failures_for_degraded = Math.max(1, Number(p.consecutive_failures_for_degraded));
  }
  if (Number.isFinite(p.consecutive_failures_for_down)) {
    state.policy.consecutive_failures_for_down = Math.max(
      state.policy.consecutive_failures_for_degraded,
      Number(p.consecutive_failures_for_down),
    );
  }
  if (Number.isFinite(p.consecutive_successes_for_healthy)) {
    state.policy.consecutive_successes_for_healthy = Math.max(1, Number(p.consecutive_successes_for_healthy));
  }
  if (Number.isFinite(p.failover_cooldown_sec)) {
    state.policy.failover_cooldown_sec = Math.max(0, Number(p.failover_cooldown_sec));
  }
  const d = args.discovery || {};
  if (typeof d.enabled === "boolean") state.discovery.enabled = d.enabled;
  if (d.source === "k8s-services") state.discovery.source = d.source;
  if (d.regions) {
    if (Array.isArray(d.regions["us-east-1"])) {
      state.discovery.regions["us-east-1"] = d.regions["us-east-1"]
        .map((r) => ({
          namespace: String(r?.namespace || "").trim(),
          label_selector: r?.label_selector ? String(r.label_selector) : undefined,
          path: r?.path ? String(r.path) : undefined,
          scheme: normalizeScheme(r?.scheme),
          port_name: r?.port_name ? String(r.port_name) : undefined,
          class: normalizeClass(r?.class),
          weight: Number.isFinite(Number(r?.weight)) ? Math.max(0.1, Number(r?.weight)) : 1,
        }))
        .filter((x) => x.namespace);
    }
    if (Array.isArray(d.regions["eu-west-1"])) {
      state.discovery.regions["eu-west-1"] = d.regions["eu-west-1"]
        .map((r) => ({
          namespace: String(r?.namespace || "").trim(),
          label_selector: r?.label_selector ? String(r.label_selector) : undefined,
          path: r?.path ? String(r.path) : undefined,
          scheme: normalizeScheme(r?.scheme),
          port_name: r?.port_name ? String(r.port_name) : undefined,
          class: normalizeClass(r?.class),
          weight: Number.isFinite(Number(r?.weight)) ? Math.max(0.1, Number(r?.weight)) : 1,
        }))
        .filter((x) => x.namespace);
    }
  }

  return {
    ...state,
  };
}

export function getHealthProbesState() {
  return {
    ...state,
    region_health: getRegionHealth(),
  };
}

async function discoverRegionProbes(region: RegionId): Promise<ProbeDef[]> {
  if (!state.discovery.enabled || state.discovery.source !== "k8s-services") return [];
  const apiServer = String(process.env.RINAWARP_K8S_API_SERVER || "").trim();
  const token = String(process.env.RINAWARP_K8S_TOKEN || "").trim();
  if (!apiServer || !token) return [];
  const rules = state.discovery.regions[region] || [];
  const out: ProbeDef[] = [];
  for (const rule of rules) {
    try {
      const query = rule.label_selector ? `?labelSelector=${encodeURIComponent(rule.label_selector)}` : "";
      const res = await fetch(
        `${apiServer}/api/v1/namespaces/${encodeURIComponent(rule.namespace)}/services${query}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) continue;
      const body = (await res.json()) as {
        items?: Array<{
          metadata?: { name?: string };
          spec?: { ports?: Array<{ name?: string; port?: number }> };
        }>;
      };
      const items = Array.isArray(body?.items) ? body.items : [];
      for (const svc of items) {
        const name = String(svc?.metadata?.name || "").trim();
        if (!name) continue;
        const ports = Array.isArray(svc?.spec?.ports) ? svc.spec.ports : [];
        let port = Number(ports[0]?.port || 80);
        if (rule.port_name) {
          const named = ports.find((p) => String(p?.name || "") === rule.port_name);
          if (named && Number.isFinite(Number(named.port))) port = Number(named.port);
        }
        const scheme = rule.scheme === "https" ? "https" : "http";
        const path = String(rule.path || "/health");
        const url = `${scheme}://${name}.${rule.namespace}.svc.cluster.local:${port}${path.startsWith("/") ? path : `/${path}`}`;
        out.push({
          url,
          class: normalizeClass(rule.class),
          weight: Number.isFinite(Number(rule.weight)) ? Math.max(0.1, Number(rule.weight)) : 1,
        });
      }
    } catch {
      // skip discovery errors; static probes still run
    }
  }
  return out;
}

async function probeUrl(url: string, timeoutMs: number): Promise<boolean> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: ctl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function computeObservedStatus(args: {
  probes: ProbeDef[];
  passedByIndex: boolean[];
  policy: ProbeThresholdPolicy;
}): "healthy" | "degraded" | "down" {
  if (args.probes.length === 0) return "healthy";

  const byClass: Record<ProbeClass, { total: number; passed: number }> = {
    app: { total: 0, passed: 0 },
    db: { total: 0, passed: 0 },
    queue: { total: 0, passed: 0 },
    "control-plane": { total: 0, passed: 0 },
  };

  let totalWeight = 0;
  let passedWeight = 0;
  for (let i = 0; i < args.probes.length; i += 1) {
    const p = args.probes[i];
    const pass = args.passedByIndex[i] === true;
    totalWeight += p.weight;
    if (pass) passedWeight += p.weight;
    byClass[p.class].total += p.weight;
    if (pass) byClass[p.class].passed += p.weight;
  }
  const overall = totalWeight > 0 ? passedWeight / totalWeight : 1;
  let severity: "healthy" | "degraded" | "down" = "healthy";
  for (const cls of ["app", "db", "queue", "control-plane"] as const) {
    const stat = byClass[cls];
    if (stat.total <= 0) continue;
    const ratio = stat.passed / stat.total;
    if (ratio >= args.policy.per_class_min_ratio[cls]) continue;
    if (ratio <= 0 && (cls === "app" || cls === "db" || cls === "control-plane")) {
      severity = "down";
      break;
    }
    severity = "degraded";
  }
  if (severity === "healthy" && overall < 0.5) return "down";
  if (severity === "healthy" && overall < 1) return "degraded";
  return severity;
}

function stabilizedStatus(args: {
  region: RegionId;
  observed: "healthy" | "degraded" | "down";
}): "healthy" | "degraded" | "down" {
  const runtime = state.runtime[args.region];
  const previous = getRegionHealth()[args.region].status;
  if (args.observed === "healthy") {
    runtime.consecutive_successes += 1;
    runtime.consecutive_failures = 0;
    if (runtime.consecutive_successes >= state.policy.consecutive_successes_for_healthy) return "healthy";
    return previous;
  }
  runtime.consecutive_failures += 1;
  runtime.consecutive_successes = 0;
  if (args.observed === "down" && runtime.consecutive_failures >= state.policy.consecutive_failures_for_down) return "down";
  if (runtime.consecutive_failures >= state.policy.consecutive_failures_for_degraded) return "degraded";
  return previous;
}

function canFailoverNow(): boolean {
  if (!state.last_failover_at) return true;
  const prev = Date.parse(state.last_failover_at);
  if (!Number.isFinite(prev)) return true;
  const cooldownMs = Math.max(0, state.policy.failover_cooldown_sec) * 1000;
  return Date.now() - prev >= cooldownMs;
}

export async function runHealthProbes(force = false): Promise<{
  ok: boolean;
  regions?: Record<
    RegionId,
    { passed: number; total: number; status: "healthy" | "degraded" | "down"; static_probes: number; discovered_probes: number }
  >;
  failover?: { from: RegionId; to: RegionId; changed: boolean; skipped?: boolean; reason?: string };
  error?: string;
}> {
  if (!force && !state.enabled) return { ok: false, error: "health_probes_disabled" };
  const regions: Record<
    RegionId,
    { passed: number; total: number; status: "healthy" | "degraded" | "down"; static_probes: number; discovered_probes: number }
  > = {
    "us-east-1": { passed: 0, total: 0, status: "healthy", static_probes: 0, discovered_probes: 0 },
    "eu-west-1": { passed: 0, total: 0, status: "healthy", static_probes: 0, discovered_probes: 0 },
  };

  for (const region of ["us-east-1", "eu-west-1"] as const) {
    const staticProbes = state.probes[region] || [];
    const discoveredProbes = await discoverRegionProbes(region);
    const probes = [...staticProbes, ...discoveredProbes];
    const passedByIndex: boolean[] = [];
    for (const probe of probes) {
      passedByIndex.push(await probeUrl(probe.url, state.timeout_ms));
    }
    let passedWeight = 0;
    let totalWeight = 0;
    for (let i = 0; i < probes.length; i += 1) {
      totalWeight += probes[i].weight;
      if (passedByIndex[i]) passedWeight += probes[i].weight;
    }
    const observed = computeObservedStatus({
      probes,
      passedByIndex,
      policy: state.policy,
    });
    const nextStatus = stabilizedStatus({ region, observed });
    setRegionHealth(region, nextStatus);
    regions[region] = {
      passed: passedWeight,
      total: totalWeight,
      status: nextStatus,
      static_probes: staticProbes.length,
      discovered_probes: discoveredProbes.length,
    };
  }

  let failover: { from: RegionId; to: RegionId; changed: boolean; skipped?: boolean; reason?: string } | undefined;
  if (state.auto_failover) {
    if (!canFailoverNow()) {
      const current = failoverDefaultRegion();
      failover = { ...current, skipped: true, reason: "cooldown_active" };
    } else {
      const out = failoverDefaultRegion();
      failover = out;
      if (out.changed) state.last_failover_at = new Date().toISOString();
    }
  }

  state.last_run_at = new Date().toISOString();
  state.last_result = "ok";
  return {
    ok: true,
    regions,
    ...(failover ? { failover } : {}),
  };
}
