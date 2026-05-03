type Role = "owner" | "operator" | "viewer";

export function createAgentdIpcHandlers(deps: {
  agentdJson: <T>(path: string, init: { method: "GET" | "POST"; body?: unknown; includeLicenseToken?: boolean }) => Promise<T>;
  getCurrentRole: () => Role;
  hasRoleAtLeast: (role: Role, minimum: Role) => boolean;
}) {
  const { agentdJson, getCurrentRole, hasRoleAtLeast } = deps;

type DaemonTaskStatus = "queued" | "running" | "completed" | "failed" | "canceled";

async function daemonStatus(): Promise<any> {
  try {
    return await agentdJson<{ ok: boolean; daemon?: any; tasks?: any }>("/v1/daemon/status", {
      method: "GET",
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      daemon: { running: false, pid: null, storeDir: null },
      tasks: { total: 0, counts: {} },
    };
  }
}

async function daemonTasks(args?: { status?: DaemonTaskStatus; deadLetter?: boolean }): Promise<any> {
  const q = new URLSearchParams();
  if (args?.status) q.set("status", args.status);
  if (args?.deadLetter) q.set("deadLetter", "1");
  const suffix = q.size > 0 ? `?${q.toString()}` : "";
  try {
    return await agentdJson<{ ok: boolean; tasks?: any[]; updatedAt?: string }>(`/v1/daemon/tasks${suffix}`, {
      method: "GET",
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      tasks: [],
    };
  }
}

async function daemonTaskAdd(args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }): Promise<any> {
  try {
    return await agentdJson<{ ok: boolean; task?: any }>("/v1/daemon/tasks", {
      method: "POST",
      body: {
        type: args?.type,
        payload: args?.payload ?? {},
        maxAttempts: args?.maxAttempts,
      },
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function daemonStart(): Promise<any> {
  try {
    return await agentdJson<{ ok: boolean; started?: boolean; alreadyRunning?: boolean; pid?: number }>("/v1/daemon/start", {
      method: "POST",
      body: {},
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function daemonStop(): Promise<any> {
  try {
    return await agentdJson<{ ok: boolean; stopped?: boolean; stale?: boolean; pid?: number }>("/v1/daemon/stop", {
      method: "POST",
      body: {},
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchRemotePlanForIpc(payload: { intentText: string; projectRoot: string }): Promise<any> {
  const resp = await agentdJson<{ ok: true; plan: any }>("/v1/plan", {
    method: "POST",
    body: payload,
    includeLicenseToken: false,
  });
  return resp.plan;
}

async function executeRemotePlanForIpc(payload: {
  plan: any[];
  projectRoot: string;
  confirmed: boolean;
  confirmationText: string;
}): Promise<{ ok: true; planRunId: string }> {
  return await agentdJson<{ ok: true; planRunId: string }>("/v1/execute-plan", {
    method: "POST",
    body: payload,
    includeLicenseToken: true,
  });
}

async function orchestratorIssueToPrForIpc(args: {
  issueId: string;
  repoPath: string;
  branchName?: string;
  command?: string;
  repoSlug?: string;
  push?: boolean;
  prDryRun?: boolean;
  baseBranch?: string;
  prTitle?: string;
  prBody?: string;
  commitMessage?: string;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/issue-to-pr", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function orchestratorGraphForIpc(): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/workspace-graph", {
      method: "GET",
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      graph: { nodes: [], edges: [] },
    };
  }
}

async function orchestratorPrepareBranchForIpc(args: {
  repoPath: string;
  issueId?: string;
  branchName?: string;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/git/prepare-branch", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function orchestratorCreatePrForIpc(args: {
  repoSlug: string;
  head: string;
  base?: string;
  title: string;
  body?: string;
  draft?: boolean;
  dryRun?: boolean;
  workflowId?: string;
  issueId?: string;
  branchName?: string;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/github/create-pr", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function orchestratorPrStatusForIpc(args: {
  workflowId: string;
  status: "planned" | "opened" | "merged" | "closed" | "failed";
  issueId?: string;
  branchName?: string;
  repoSlug?: string;
  mode?: "dry_run" | "live";
  number?: number;
  url?: string;
  error?: string;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/github/pr-status", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function orchestratorWebhookAuditForIpc(args?: {
  limit?: number;
  outcome?: "accepted" | "rejected";
  mapped?: "pr_status" | "ci_status" | "review_revision";
}): Promise<any> {
  try {
    const role = getCurrentRole();
    if (!hasRoleAtLeast(role, "operator")) {
      return {
        ok: false,
        error: "Only owner/operator can access webhook audit events.",
        entries: [],
        count: 0,
      };
    }
    const params = new URLSearchParams();
    if (typeof args?.limit === "number" && Number.isFinite(args.limit)) params.set("limit", String(args.limit));
    if (args?.outcome) params.set("outcome", args.outcome);
    if (args?.mapped) params.set("mapped", args.mapped);
    const qs = params.toString();
    const path = qs ? `/v1/orchestrator/github/webhook-audit?${qs}` : "/v1/orchestrator/github/webhook-audit";
    return await agentdJson(path, {
      method: "GET",
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      entries: [],
      count: 0,
    };
  }
}

async function orchestratorCiStatusForIpc(args: {
  workflowId: string;
  provider: string;
  status: "queued" | "running" | "passed" | "failed";
  url?: string;
  autoRetry?: boolean;
  repoPath?: string;
  issueId?: string;
  branchName?: string;
  command?: string;
  repoSlug?: string;
  baseBranch?: string;
  prDryRun?: boolean;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/ci/status", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function orchestratorReviewCommentForIpc(args: {
  workflowId: string;
  repoPath: string;
  issueId: string;
  branchName: string;
  comment: string;
  command?: string;
  repoSlug?: string;
  baseBranch?: string;
  prDryRun?: boolean;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/review/comment", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

  return {
    daemonStatus,
    daemonTasks,
    daemonTaskAdd,
    daemonStart,
    daemonStop,
    fetchRemotePlan: fetchRemotePlanForIpc,
    executeRemotePlan: executeRemotePlanForIpc,
    orchestratorIssueToPrForIpc,
    orchestratorGraphForIpc,
    orchestratorPrepareBranchForIpc,
    orchestratorCreatePrForIpc,
    orchestratorPrStatusForIpc,
    orchestratorWebhookAuditForIpc,
    orchestratorCiStatusForIpc,
    orchestratorReviewCommentForIpc,
  };
}
