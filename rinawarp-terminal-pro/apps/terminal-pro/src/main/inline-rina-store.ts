import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type InlineRinaTriggerType = "input" | "failure" | "selection";
export type InlineRinaAction =
  | "generateCommand"
  | "debugCommandFailure"
  | "explainSelection"
  | "suggestNextCommand";

export type InlineRinaRunRecord = {
  id: string;
  workspace_id: string;
  session_id: string;
  trigger_type: InlineRinaTriggerType;
  action: InlineRinaAction;
  source_text: string;
  explanation: string;
  command: string | null;
  risk: "low" | "medium" | "high";
  confirmation_required: boolean;
  approved: boolean;
  executed: boolean;
  execution_exit_code: number | null;
  llm_model?: string | null;
  prompt_tokens?: number | null;
  response_tokens?: number | null;
  total_tokens?: number | null;
  created_at: string;
};

type InlineRinaRunPatch = Partial<Pick<InlineRinaRunRecord, "approved" | "executed" | "execution_exit_code">>;

type StoreShape = {
  runs: InlineRinaRunRecord[];
};

type InlineRinaRunFilters = {
  triggerType?: InlineRinaTriggerType | "";
  approved?: "yes" | "no" | "";
  executed?: "yes" | "no" | "";
  limit?: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function stableWorkspaceId(workspacePath: string): string {
  return crypto.createHash("sha256").update(String(workspacePath || "")).digest("hex").slice(0, 16);
}

export class InlineRinaRunStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private readStore(): StoreShape {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as StoreShape;
      return Array.isArray(parsed?.runs) ? parsed : { runs: [] };
    } catch {
      return { runs: [] };
    }
  }

  private writeStore(data: StoreShape): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  createRun(input: {
    workspacePath: string;
    sessionId: string;
    triggerType: InlineRinaTriggerType;
    action: InlineRinaAction;
    sourceText: string;
    explanation: string;
    command: string | null;
    risk: "low" | "medium" | "high";
    confirmationRequired: boolean;
    llmModel?: string | null;
    promptTokens?: number | null;
    responseTokens?: number | null;
    totalTokens?: number | null;
  }): InlineRinaRunRecord {
    const store = this.readStore();
    const record: InlineRinaRunRecord = {
      id: randomId("inline_rina"),
      workspace_id: stableWorkspaceId(input.workspacePath),
      session_id: input.sessionId,
      trigger_type: input.triggerType,
      action: input.action,
      source_text: input.sourceText,
      explanation: input.explanation,
      command: input.command,
      risk: input.risk,
      confirmation_required: input.confirmationRequired,
      approved: false,
      executed: false,
      execution_exit_code: null,
      llm_model: input.llmModel ?? null,
      prompt_tokens: input.promptTokens ?? null,
      response_tokens: input.responseTokens ?? null,
      total_tokens: input.totalTokens ?? null,
      created_at: nowIso(),
    };
    store.runs.push(record);
    this.writeStore(store);
    return record;
  }

  updateRun(id: string, patch: InlineRinaRunPatch): InlineRinaRunRecord | null {
    const store = this.readStore();
    const idx = store.runs.findIndex((run) => run.id === id);
    if (idx === -1) return null;
    store.runs[idx] = {
      ...store.runs[idx],
      ...patch,
    };
    this.writeStore(store);
    return store.runs[idx];
  }

  listRuns(filters: InlineRinaRunFilters = {}): InlineRinaRunRecord[] {
    const limit = Math.max(1, Math.min(Number(filters.limit || 50), 500));
    return this.readStore().runs
      .filter((run) => {
        if (filters.triggerType && run.trigger_type !== filters.triggerType) return false;
        if (filters.approved === "yes" && !run.approved) return false;
        if (filters.approved === "no" && run.approved) return false;
        if (filters.executed === "yes" && !run.executed) return false;
        if (filters.executed === "no" && run.executed) return false;
        return true;
      })
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit);
  }

  exportRuns(format: "json" | "csv", filters: InlineRinaRunFilters = {}): string {
    const rows = this.listRuns({ ...filters, limit: Math.max(1, Math.min(Number(filters.limit || 500), 2000)) });
    if (format === "json") {
      return JSON.stringify(rows, null, 2);
    }
    const header = [
      "id",
      "workspace_id",
      "session_id",
      "trigger_type",
      "action",
      "source_text",
      "explanation",
      "command",
      "risk",
      "confirmation_required",
      "approved",
      "executed",
      "execution_exit_code",
      "llm_model",
      "prompt_tokens",
      "response_tokens",
      "total_tokens",
      "created_at",
    ];
    const csvRows = rows.map((row) =>
      header
        .map((key) => {
          const value = (row as Record<string, unknown>)[key];
          const text = value == null ? "" : String(value);
          return `"${text.replaceAll(`"`, `""`)}"`;
        })
        .join(","),
    );
    return [header.join(","), ...csvRows].join("\n");
  }
}
