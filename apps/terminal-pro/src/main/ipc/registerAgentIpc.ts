import type { IpcMain } from "electron";

type DaemonTaskStatus = "queued" | "running" | "completed" | "failed" | "canceled";

export function registerAgentIpc(args: {
  ipcMain: IpcMain;
  daemonStatus: () => Promise<any>;
  daemonTasks: (args?: { status?: DaemonTaskStatus; deadLetter?: boolean }) => Promise<any>;
  daemonTaskAdd: (args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }) => Promise<any>;
  daemonStart: () => Promise<any>;
  daemonStop: () => Promise<any>;
}) {
  const { ipcMain } = args;

  ipcMain.handle("rina:daemon:status", async () => args.daemonStatus());
  ipcMain.handle("rina:daemon:tasks", async (_event, payload) => args.daemonTasks(payload));
  ipcMain.handle("rina:daemon:task:add", async (_event, payload) => args.daemonTaskAdd(payload));
  ipcMain.handle("rina:daemon:start", async () => args.daemonStart());
  ipcMain.handle("rina:daemon:stop", async () => args.daemonStop());
}
