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
      orchestratorIssueToPr?: (args: { issueId: string; repoPath: string; branchName?: string; command?: string }) => Promise<any>;
      orchestratorGraph?: () => Promise<any>;
      codeListFiles?: (args: { projectRoot: string; limit?: number }) => Promise<{ ok: boolean; files?: string[]; error?: string }>;
      codeReadFile?: (args: { projectRoot: string; relativePath: string; maxBytes?: number }) => Promise<{ ok: boolean; content?: string; truncated?: boolean; error?: string }>;
    };
  }
}
