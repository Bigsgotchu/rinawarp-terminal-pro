import type { IpcMain } from "electron";

export function registerChatIpc(args: {
  ipcMain: IpcMain;
  sendChat: (text: string, projectRoot?: string) => Promise<unknown>;
  inlineRinaAsk: (payload: {
    prompt: string;
    projectRoot?: string;
    action?: "generateCommand" | "debugCommandFailure" | "explainSelection" | "suggestNextCommand";
    selectedText?: string;
    triggerType?: "input" | "failure" | "selection";
    sourceText?: string;
  }, senderId: number) => Promise<unknown>;
  inlineRinaApprove: (payload: { runId?: string; command?: string }, senderId: number) => Promise<unknown>;
  inlineRinaListRuns: (payload?: {
    triggerType?: "input" | "failure" | "selection" | "";
    approved?: "yes" | "no" | "";
    executed?: "yes" | "no" | "";
    limit?: number;
  }) => Promise<unknown>;
  inlineRinaExportRuns: (payload?: {
    format?: "json" | "csv";
    triggerType?: "input" | "failure" | "selection" | "";
    approved?: "yes" | "no" | "";
    executed?: "yes" | "no" | "";
    limit?: number;
  }) => Promise<unknown>;
  getRinaUsageStatus: () => Promise<unknown>;
  exportChatTranscript: () => Promise<string>;
}) {
  const { ipcMain } = args;

  ipcMain.handle("rina:chat:send", async (_event, text: string, projectRoot?: string) =>
    args.sendChat(text, projectRoot),
  );
  ipcMain.handle("rina:inline:ask", async (event, payload: {
    prompt: string;
    projectRoot?: string;
    action?: "generateCommand" | "debugCommandFailure" | "explainSelection" | "suggestNextCommand";
    selectedText?: string;
    triggerType?: "input" | "failure" | "selection";
    sourceText?: string;
  }) =>
    args.inlineRinaAsk(payload, event.sender.id),
  );
  ipcMain.handle("rina:inline:approve", async (event, payload: { runId?: string; command?: string }) =>
    args.inlineRinaApprove(payload, event.sender.id),
  );
  ipcMain.handle("rina:inline:runs:list", async (_event, payload) => args.inlineRinaListRuns(payload));
  ipcMain.handle("rina:inline:runs:export", async (_event, payload) => args.inlineRinaExportRuns(payload));
  ipcMain.handle("rina:get-usage-status", async () => args.getRinaUsageStatus());
  ipcMain.handle("rina:chat:export", async () => args.exportChatTranscript());
}
