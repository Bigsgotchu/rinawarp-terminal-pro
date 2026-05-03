import { scoreTextMatch } from "../search-ranking.js";

type Role = "owner" | "operator" | "viewer";

export function createUnifiedSearchRuntime(deps: {
  getTranscriptEntries: () => any[];
  getStructuredSessionStore: () => { searchCommands: (query: string, limit: number) => any[] } | null;
  loadSharesDb: () => { shares: any[] };
  getCurrentRole: () => Role;
  hasRoleAtLeast: (role: Role, minimum: Role) => boolean;
}) {
  const {
    getTranscriptEntries,
    getStructuredSessionStore,
    loadSharesDb,
    getCurrentRole,
    hasRoleAtLeast,
  } = deps;

type UnifiedSearchSource = "structured" | "transcript" | "share";
type UnifiedSearchHit = {
  id: string;
  source: UnifiedSearchSource;
  label: string;
  meta: string;
  snippet?: string;
  command?: string;
  shareId?: string;
  createdAt: string;
  score: number;
};

function recencyBoost(iso: string): number {
  const ts = Date.parse(String(iso || ""));
  if (!Number.isFinite(ts)) return 0;
  const ageHours = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60));
  if (ageHours <= 1) return 2;
  if (ageHours <= 24) return 1;
  if (ageHours <= 24 * 7) return 0.5;
  return 0;
}

function searchTranscriptEntries(query: string, limit: number): UnifiedSearchHit[] {
  const out: UnifiedSearchHit[] = [];
  const q = String(query || "").trim();
  const entries = getTranscriptEntries().slice(-500).reverse();
  for (const entry of entries) {
    let label = "";
    let meta = `transcript • ${entry.type}`;
    let haystack = "";
    let command: string | undefined;

    if (entry.type === "execution_start") {
      label = entry.command;
      command = entry.command;
      meta = `transcript • command • ${entry.stepId}`;
      haystack = `${entry.command} ${entry.stepId}`;
    } else if (entry.type === "intent") {
      label = entry.intent;
      haystack = entry.intent;
      meta = "transcript • intent";
    } else if (entry.type === "signal") {
      label = entry.signal;
      haystack = `${entry.signal} ${entry.interpretation}`;
      meta = "transcript • signal";
    } else if (entry.type === "verification") {
      label = `${entry.check}: ${entry.status}`;
      haystack = `${entry.check} ${entry.result} ${entry.status}`;
      meta = "transcript • verification";
    } else if (entry.type === "outcome") {
      label = `Outcome: ${entry.rootCause}`;
      haystack = `${entry.rootCause} ${entry.changes.join(" ")} ${entry.evidenceBefore} ${entry.evidenceAfter}`;
      meta = `transcript • outcome • ${entry.confidence}`;
    } else if (entry.type === "playbook") {
      label = entry.playbookName;
      haystack = `${entry.playbookName} ${entry.playbookId}`;
      meta = "transcript • playbook";
    } else if (entry.type === "approval") {
      label = entry.command;
      command = entry.command;
      haystack = `${entry.command} ${entry.risk} ${entry.approved ? "approved" : "denied"}`;
      meta = `transcript • approval • ${entry.risk}`;
    } else if (entry.type === "memory") {
      label = `${entry.category}: ${entry.key}`;
      haystack = `${entry.category} ${entry.key} ${entry.value}`;
      meta = "transcript • memory";
    } else if (entry.type === "execution_end") {
      label = entry.ok ? "Execution success" : `Execution failed: ${entry.error || "unknown"}`;
      haystack = `${entry.error || ""} ${entry.ok ? "success" : "failed"}`;
      meta = "transcript • execution end";
    } else if (entry.type === "plan") {
      label = entry.plan.intent || entry.plan.reasoning;
      haystack = `${entry.plan.intent} ${entry.plan.reasoning} ${(entry.plan.steps || []).map((s: any) => s.command).join(" ")}`;
      meta = "transcript • plan";
    }

    if (!label) continue;
    const score = scoreTextMatch(q, haystack);
    if (q && score < 0) continue;
    const total = (score > 0 ? score : 0.05) + recencyBoost(entry.timestamp);
    out.push({
      id: `transcript:${entry.timestamp}:${entry.type}:${out.length}`,
      source: "transcript",
      label,
      meta,
      snippet: haystack.slice(0, 220),
      command,
      createdAt: entry.timestamp,
      score: Number(total.toFixed(4)),
    });
    if (out.length >= Math.max(5, limit * 2)) break;
  }
  return out;
}

function searchShareRecords(query: string, limit: number): UnifiedSearchHit[] {
  const out: UnifiedSearchHit[] = [];
  const q = String(query || "").trim();
  const role = getCurrentRole();
  const shares = loadSharesDb().shares
    .filter((s) => hasRoleAtLeast(role, s.requiredRole))
    .slice(0, 250);
  for (const s of shares) {
    const label = s.title || `Share ${s.id}`;
    const summary = `${label}\n${s.content || ""}`;
    const score = scoreTextMatch(q, summary);
    if (q && score < 0) continue;
    const status = s.revoked ? "revoked" : (Date.now() > Date.parse(s.expiresAt) ? "expired" : "active");
    const total = (score > 0 ? score : 0.05) + recencyBoost(s.createdAt);
    out.push({
      id: `share:${s.id}`,
      source: "share",
      label,
      meta: `share • ${status} • ${s.requiredRole}`,
      snippet: String(s.content || "").slice(0, 220),
      shareId: s.id,
      createdAt: s.createdAt,
      score: Number(total.toFixed(4)),
    });
    if (out.length >= Math.max(5, limit * 2)) break;
  }
  return out;
}

function searchStructuredRecords(query: string, limit: number): UnifiedSearchHit[] {
  const structuredSessionStore = getStructuredSessionStore();
  if (!structuredSessionStore) return [];
  const hits = structuredSessionStore.searchCommands(String(query || ""), Math.max(10, limit * 2));
  return hits.map((h) => {
    const status = h.ok === true ? "ok" : h.ok === false ? "failed" : "unknown";
    const meta = `structured • ${status} • ${h.risk || "read"} • ${h.cwd || "(default)"}`;
    const total = Number((h.score + recencyBoost(h.startedAt)).toFixed(4));
    return {
      id: `structured:${h.commandId}`,
      source: "structured",
      label: h.command,
      meta,
      snippet: h.snippet,
      command: h.command,
      createdAt: h.startedAt,
      score: total,
    } as UnifiedSearchHit;
  });
}

function runUnifiedSearch(query: string, limit = 20): UnifiedSearchHit[] {
  const safeLimit = Math.max(1, Math.min(Number(limit || 20), 100));
  const sourceBoost: Record<UnifiedSearchSource, number> = {
    structured: 0.9,
    transcript: 0.45,
    share: 0.25,
  };
  const all = [
    ...searchStructuredRecords(query, safeLimit),
    ...searchTranscriptEntries(query, safeLimit),
    ...searchShareRecords(query, safeLimit),
  ].map((h) => ({
    ...h,
    score: Number((h.score + (sourceBoost[h.source] || 0)).toFixed(4)),
  }));
  return all
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    })
    .slice(0, safeLimit);
}

  return { runUnifiedSearch };
}
