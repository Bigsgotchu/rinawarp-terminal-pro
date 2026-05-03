import type { IpcMain } from "electron";
import type {
  MemoryDeleteEntryArgs,
  MemoryIpcDeps,
  MemoryProfileUpdate,
  MemoryWorkspaceUpdate,
} from "../startup/runtimeTypes.js";

function asIpcMain(ipcMain: unknown): IpcMain {
  return ipcMain as IpcMain;
}

export function registerMemoryIpc(deps: MemoryIpcDeps): void {
  const ipcMain = asIpcMain(deps.ipcMain);

  ipcMain.handle("rina:memory:getState", async () => deps.getState());

  ipcMain.handle("rina:memory:updateProfile", async (_event, input: MemoryProfileUpdate) =>
    deps.updateProfile(input),
  );

  ipcMain.handle(
    "rina:memory:updateWorkspace",
    async (_event, workspaceId: string, input: MemoryWorkspaceUpdate) =>
      deps.updateWorkspace(workspaceId, input),
  );

  ipcMain.handle("rina:memory:deleteEntry", async (_event, input: MemoryDeleteEntryArgs) =>
    deps.deleteEntry(input),
  );

  ipcMain.handle(
    "rina:memory:setInferredStatus",
    async (_event, id: string, status: "approved" | "dismissed") =>
      deps.setInferredMemoryStatus(id, status),
  );

  ipcMain.handle(
    "rina:memory:setOperationalStatus",
    async (_event, id: string, status: "approved" | "rejected") =>
      deps.setOperationalMemoryStatus(id, status),
  );

  ipcMain.handle("rina:memory:deleteOperational", async (_event, id: string) =>
    deps.deleteOperationalMemory(id),
  );

  ipcMain.handle("rina:memory:resetWorkspace", async (_event, workspaceId: string) =>
    deps.resetWorkspace(workspaceId),
  );

  ipcMain.handle("rina:memory:resetAll", async () => deps.resetAll());
}
