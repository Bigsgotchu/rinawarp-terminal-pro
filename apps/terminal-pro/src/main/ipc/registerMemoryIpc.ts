import type { IpcMain } from "electron";
import type { AppContext } from "../context.js";

export function registerMemoryIpc(args: {
  ipcMain: IpcMain;
  ctx: AppContext;
  operationalMemory: {
    getRecent: (category: string) => any[];
    set: (category: string, key: string, value: string) => void;
  };
  addTranscriptEntry: (entry: { type: "memory"; timestamp: string; category: string; key: string; value: string }) => void;
}) {
  args.ipcMain.handle("rina:memory:get", async (_event, category: string) => args.operationalMemory.getRecent(category));

  args.ipcMain.handle("rina:memory:set", async (_event, category: string, key: string, value: string) => {
    args.operationalMemory.set(category, key, value);
    args.addTranscriptEntry({ type: "memory", timestamp: new Date().toISOString(), category, key, value });
  });
}
