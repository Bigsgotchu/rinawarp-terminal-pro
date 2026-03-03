export {};

declare global {
  interface Window {
    rina?: {
      plan: (intent: string) => Promise<any>;
      execute: () => Promise<any>;
      verifyLicense: (customerId: string) => Promise<any>;
      ptyStart?: (args?: { cols?: number; rows?: number; cwd?: string }) => Promise<any>;
      ptyWrite?: (data: string) => Promise<any>;
      ptyResize?: (cols: number, rows: number) => Promise<any>;
      daemonStatus?: () => Promise<any>;
      daemonStart?: () => Promise<any>;
      daemonStop?: () => Promise<any>;
      daemonTasks?: (args?: { status?: "queued" | "running" | "completed" | "failed" | "canceled"; deadLetter?: boolean }) => Promise<any>;
      daemonTaskAdd?: (args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }) => Promise<any>;
      orchestratorIssueToPr?: (args: {
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
      }) => Promise<any>;
      orchestratorGraph?: () => Promise<any>;
      orchestratorPrepareBranch?: (args: { repoPath: string; issueId?: string; branchName?: string }) => Promise<any>;
      orchestratorCreatePr?: (args: {
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
      }) => Promise<any>;
      orchestratorPrStatus?: (args: {
        workflowId: string;
        status: "planned" | "opened" | "merged" | "closed" | "failed";
        issueId?: string;
        branchName?: string;
        repoSlug?: string;
        mode?: "dry_run" | "live";
        number?: number;
        url?: string;
        error?: string;
      }) => Promise<any>;
      orchestratorWebhookAudit?: (args?: {
        limit?: number;
        outcome?: "accepted" | "rejected";
        mapped?: "pr_status" | "ci_status" | "review_revision";
      }) => Promise<any>;
      orchestratorCiStatus?: (args: {
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
      }) => Promise<any>;
      orchestratorReviewComment?: (args: {
        workflowId: string;
        repoPath: string;
        issueId: string;
        branchName: string;
        comment: string;
        command?: string;
        repoSlug?: string;
        baseBranch?: string;
        prDryRun?: boolean;
      }) => Promise<any>;
      codeListFiles?: (args: { projectRoot: string; limit?: number }) => Promise<{ ok: boolean; files?: string[]; error?: string }>;
      codeReadFile?: (args: { projectRoot: string; relativePath: string; maxBytes?: number }) => Promise<{ ok: boolean; content?: string; truncated?: boolean; error?: string }>;
    };
  }
}
