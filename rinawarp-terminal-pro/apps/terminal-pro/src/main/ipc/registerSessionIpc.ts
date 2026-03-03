import { redactText } from "@rinawarp/safety/redaction";
import type { IpcMain } from "electron";
import type { ShellKind } from "../../prompt-boundary.js";
import type { AppContext } from "../context.js";

export function registerSessionIpc(args: {
  ipcMain: IpcMain;
  ctx: AppContext;
  getSessionTranscript: () => unknown;
  exportTranscript: (format: "json" | "text") => string;
  addTranscriptEntry: (entry: any) => void;
  runUnifiedSearch: (query: string, limit?: number) => unknown;
  detectCommandBoundaries: (transcript: string, shellHint?: ShellKind) => unknown;
}) {
  args.ipcMain.handle("rina:transcript:get", async () => args.getSessionTranscript());

  args.ipcMain.handle("rina:transcript:export", async (_event, format: "json" | "text") =>
    args.exportTranscript(format)
  );

  args.ipcMain.handle("rina:transcript:add", async (_event, entry: any) =>
    args.addTranscriptEntry({ ...entry, timestamp: new Date().toISOString() })
  );

  args.ipcMain.handle("rina:structured:status", async () => {
    return {
      enabled: !!args.ctx.structuredSessionStore,
      latestSessionId: args.ctx.structuredSessionStore?.latestSessionId() ?? null,
    };
  });

  args.ipcMain.handle("rina:structured:runbook:export", async (_event, sessionId?: string) => {
    if (!args.ctx.structuredSessionStore) {
      return "# RinaWarp Runbook\n\nStructured session store is disabled.\n";
    }
    const markdown = args.ctx.structuredSessionStore.exportRunbookMarkdown(sessionId);
    return redactText(markdown).redactedText;
  });

  args.ipcMain.handle("rina:structured:runbook:preview", async (_event, sessionId?: string) => {
    if (!args.ctx.structuredSessionStore) {
      return {
        markdown: "# RinaWarp Runbook\n\nStructured session store is disabled.\n",
        hits: [],
        redactionCount: 0,
      };
    }
    const markdown = args.ctx.structuredSessionStore.exportRunbookMarkdown(sessionId);
    const redacted = redactText(markdown);
    return {
      markdown: redacted.redactedText,
      hits: redacted.hits,
      redactionCount: redacted.hits.length,
    };
  });

  args.ipcMain.handle("rina:structured:runbook:json", async (_event, sessionId?: string) => {
    if (!args.ctx.structuredSessionStore) return null;
    return args.ctx.structuredSessionStore.exportRunbookJson(sessionId);
  });

  args.ipcMain.handle("rina:structured:search", async (_event, query: string, limit?: number) => {
    if (!args.ctx.structuredSessionStore) return [];
    return args.ctx.structuredSessionStore.searchCommands(String(query || ""), Number(limit || 25));
  });

  args.ipcMain.handle("rina:search:unified", async (_event, query: string, limit?: number) => {
    return args.runUnifiedSearch(String(query || ""), Number(limit || 20));
  });

  args.ipcMain.handle("rina:structured:detect-boundaries", async (_event, transcript: string, shellHint?: ShellKind) => {
    return args.detectCommandBoundaries(String(transcript || ""), shellHint);
  });
}
