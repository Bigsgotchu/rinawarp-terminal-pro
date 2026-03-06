import type { IpcMain } from "electron";

export function registerCodeIpc(args: {
  ipcMain: IpcMain;
  listFiles: (payload?: { projectRoot?: string; limit?: number }) => Promise<{ ok: boolean; files?: string[]; error?: string }>;
  readFile: (payload?: {
    projectRoot?: string;
    relativePath?: string;
    maxBytes?: number;
  }) => Promise<{ ok: boolean; content?: string; relativePath?: string; truncated?: boolean; error?: string }>;
}) {
  const { ipcMain } = args;

  ipcMain.handle("rina:code:listFiles", async (_event, payload) => args.listFiles(payload));
  ipcMain.handle("rina:code:readFile", async (_event, payload) => args.readFile(payload));
}
