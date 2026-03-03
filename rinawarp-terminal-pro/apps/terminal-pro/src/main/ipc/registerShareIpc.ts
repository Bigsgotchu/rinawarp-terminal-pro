import type { IpcMain } from "electron";

type Role = "owner" | "operator" | "viewer";

export function registerShareIpc(args: {
  ipcMain: IpcMain;
  preview: (payload: { content: string }) => Promise<unknown>;
  create: (payload: {
    title?: string;
    content?: string;
    expiresDays?: number;
    requiredRole?: Role;
    previewId?: string;
  }) => Promise<unknown>;
  list: () => Promise<unknown>;
  get: (id: string) => Promise<unknown>;
  revoke: (id: string) => Promise<unknown>;
}) {
  const { ipcMain } = args;

  ipcMain.handle("rina:share:preview", async (_event, payload: { content: string }) => args.preview(payload));
  ipcMain.handle(
    "rina:share:create",
    async (
      _event,
      payload: { title?: string; content?: string; expiresDays?: number; requiredRole?: Role; previewId?: string },
    ) => args.create(payload),
  );
  ipcMain.handle("rina:share:list", async () => args.list());
  ipcMain.handle("rina:share:get", async (_event, id: string) => args.get(id));
  ipcMain.handle("rina:share:revoke", async (_event, id: string) => args.revoke(id));
}
