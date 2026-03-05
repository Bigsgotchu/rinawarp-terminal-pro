import fs from "node:fs";
import path from "node:path";
import { paths } from "../daemon/state.js";
import { reconcileRuntimeTasks } from "./runtime.js";
import { reconcileTrafficManager } from "./trafficManager.js";
import { verifyAttestationChain } from "./attestation.js";
import { getArchiveState, runArchiveJob } from "./archive.js";

type ReconcileState = {
  version: 1;
  enabled: boolean;
  runtime_queue_stuck_after_sec: number;
  runtime_running_stuck_grace_sec: number;
  runtime_auto_remediate: boolean;
  max_runtime_remediations: number;
  archive_interval_sec: number;
  last_run_at?: string;
  last_result?: "ok" | "error";
  last_report?: Record<string, unknown>;
};

function filePath(): string {
  return path.join(paths().baseDir, "reconcile-state.json");
}

function loadState(): ReconcileState {
  const fp = filePath();
  if (!fs.existsSync(fp)) {
    return {
      version: 1,
      enabled: true,
      runtime_queue_stuck_after_sec: 15 * 60,
      runtime_running_stuck_grace_sec: 5 * 60,
      runtime_auto_remediate: true,
      max_runtime_remediations: 50,
      archive_interval_sec: 60 * 60,
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, "utf8")) as ReconcileState;
    if (!parsed || parsed.version !== 1) throw new Error("invalid");
    return {
      version: 1,
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true,
      runtime_queue_stuck_after_sec: Math.max(60, Number(parsed.runtime_queue_stuck_after_sec || 15 * 60)),
      runtime_running_stuck_grace_sec: Math.max(30, Number(parsed.runtime_running_stuck_grace_sec || 5 * 60)),
      runtime_auto_remediate: typeof parsed.runtime_auto_remediate === "boolean" ? parsed.runtime_auto_remediate : true,
      max_runtime_remediations: Math.max(1, Number(parsed.max_runtime_remediations || 50)),
      archive_interval_sec: Math.max(60, Number(parsed.archive_interval_sec || 60 * 60)),
      last_run_at: parsed.last_run_at,
      last_result: parsed.last_result,
      last_report: parsed.last_report,
    };
  } catch {
    return {
      version: 1,
      enabled: true,
      runtime_queue_stuck_after_sec: 15 * 60,
      runtime_running_stuck_grace_sec: 5 * 60,
      runtime_auto_remediate: true,
      max_runtime_remediations: 50,
      archive_interval_sec: 60 * 60,
    };
  }
}

function saveState(state: ReconcileState): void {
  const fp = filePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function configureReconciler(args: {
  enabled?: boolean;
  runtime_queue_stuck_after_sec?: number;
  runtime_running_stuck_grace_sec?: number;
  runtime_auto_remediate?: boolean;
  max_runtime_remediations?: number;
  archive_interval_sec?: number;
}) {
  const state = loadState();
  if (typeof args.enabled === "boolean") state.enabled = args.enabled;
  if (Number.isFinite(args.runtime_queue_stuck_after_sec)) state.runtime_queue_stuck_after_sec = Math.max(60, Number(args.runtime_queue_stuck_after_sec));
  if (Number.isFinite(args.runtime_running_stuck_grace_sec)) state.runtime_running_stuck_grace_sec = Math.max(30, Number(args.runtime_running_stuck_grace_sec));
  if (typeof args.runtime_auto_remediate === "boolean") state.runtime_auto_remediate = args.runtime_auto_remediate;
  if (Number.isFinite(args.max_runtime_remediations)) state.max_runtime_remediations = Math.max(1, Number(args.max_runtime_remediations));
  if (Number.isFinite(args.archive_interval_sec)) state.archive_interval_sec = Math.max(60, Number(args.archive_interval_sec));
  saveState(state);
  return state;
}

export function getReconcilerState() {
  return loadState();
}

function shouldRunArchive(state: ReconcileState, force: boolean): boolean {
  if (force) return true;
  const archive = getArchiveState();
  if (!archive.enabled) return false;
  const lastRun = Date.parse(String(archive.last_run_at || ""));
  if (!Number.isFinite(lastRun)) return true;
  return Date.now() - lastRun >= state.archive_interval_sec * 1000;
}

export async function runFullReconcile(force = false): Promise<{
  ok: boolean;
  runtime: ReturnType<typeof reconcileRuntimeTasks>;
  traffic: Awaited<ReturnType<typeof reconcileTrafficManager>>;
  attestation: Awaited<ReturnType<typeof verifyAttestationChain>>;
  archive:
    | { ok: true; skipped: true; reason: string }
    | ({ ok: boolean; archived_file?: string; sha256?: string; uploaded?: boolean; upload_etag?: string; upload_version_id?: string; error?: string } & {
        skipped?: false;
      });
}> {
  const state = loadState();
  if (!force && !state.enabled) {
    return {
      ok: false,
      runtime: { ok: true, scanned: 0, flagged_stuck: 0, remediated: 0, skipped: 0 },
      traffic: { ok: false, error: "reconciler_disabled" },
      attestation: { ok: false, total: 0, invalid: 0 },
      archive: { ok: true as const, skipped: true as const, reason: "reconciler_disabled" },
    };
  }
  const runtime = reconcileRuntimeTasks({
    queueStuckAfterSec: state.runtime_queue_stuck_after_sec,
    runningStuckGraceSec: state.runtime_running_stuck_grace_sec,
    autoRemediate: state.runtime_auto_remediate,
    maxRemediations: state.max_runtime_remediations,
  });
  const traffic = await reconcileTrafficManager(force);
  const attestation = await verifyAttestationChain();
  const archive = shouldRunArchive(state, force)
    ? { ...(await runArchiveJob(force)), skipped: false as const }
    : { ok: true as const, skipped: true as const, reason: "archive_interval_not_elapsed_or_disabled" };
  const ok = runtime.ok && traffic.ok && attestation.ok && archive.ok;
  state.last_run_at = new Date().toISOString();
  state.last_result = ok ? "ok" : "error";
  state.last_report = {
    runtime,
    traffic,
    attestation,
    archive,
  };
  saveState(state);
  return {
    ok,
    runtime,
    traffic,
    attestation,
    archive,
  };
}
