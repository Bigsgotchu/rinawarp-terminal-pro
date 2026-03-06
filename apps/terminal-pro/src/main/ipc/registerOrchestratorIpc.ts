import type { IpcMain } from "electron";

type IssueToPrArgs = {
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
};

type PrepareBranchArgs = {
  repoPath: string;
  issueId?: string;
  branchName?: string;
};

type CreatePrArgs = {
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
};

type PrStatusArgs = {
  workflowId: string;
  status: "planned" | "opened" | "merged" | "closed" | "failed";
  issueId?: string;
  branchName?: string;
  repoSlug?: string;
  mode?: "dry_run" | "live";
  number?: number;
  url?: string;
  error?: string;
};

type WebhookAuditArgs = {
  limit?: number;
  outcome?: "accepted" | "rejected";
  mapped?: "pr_status" | "ci_status" | "review_revision";
};

type CiStatusArgs = {
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
};

type ReviewCommentArgs = {
  workflowId: string;
  repoPath: string;
  issueId: string;
  branchName: string;
  comment: string;
  command?: string;
  repoSlug?: string;
  baseBranch?: string;
  prDryRun?: boolean;
};

export function registerOrchestratorIpc(args: {
  ipcMain: IpcMain;
  issueToPr: (args: IssueToPrArgs) => Promise<any>;
  workspaceGraph: () => Promise<any>;
  prepareBranch: (args: PrepareBranchArgs) => Promise<any>;
  createPr: (args: CreatePrArgs) => Promise<any>;
  prStatus: (args: PrStatusArgs) => Promise<any>;
  webhookAudit: (args?: WebhookAuditArgs) => Promise<any>;
  ciStatus: (args: CiStatusArgs) => Promise<any>;
  reviewComment: (args: ReviewCommentArgs) => Promise<any>;
}) {
  const { ipcMain } = args;

  ipcMain.handle("rina:orchestrator:issue-to-pr", async (_event, payload: IssueToPrArgs) => args.issueToPr(payload));
  ipcMain.handle("rina:orchestrator:workspace-graph", async () => args.workspaceGraph());
  ipcMain.handle("rina:orchestrator:git:prepare-branch", async (_event, payload: PrepareBranchArgs) =>
    args.prepareBranch(payload),
  );
  ipcMain.handle("rina:orchestrator:github:create-pr", async (_event, payload: CreatePrArgs) => args.createPr(payload));
  ipcMain.handle("rina:orchestrator:github:pr-status", async (_event, payload: PrStatusArgs) => args.prStatus(payload));
  ipcMain.handle("rina:orchestrator:github:webhook-audit", async (_event, payload?: WebhookAuditArgs) =>
    args.webhookAudit(payload),
  );
  ipcMain.handle("rina:orchestrator:ci:status", async (_event, payload: CiStatusArgs) => args.ciStatus(payload));
  ipcMain.handle("rina:orchestrator:review:comment", async (_event, payload: ReviewCommentArgs) =>
    args.reviewComment(payload),
  );
}
