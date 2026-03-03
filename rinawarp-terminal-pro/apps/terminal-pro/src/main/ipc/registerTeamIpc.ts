import type { IpcMain } from "electron";

type Role = "owner" | "operator" | "viewer";

export function registerTeamIpc(args: {
  ipcMain: IpcMain;
  getTeam: () => Promise<unknown>;
  setCurrentUser: (email: string) => Promise<unknown>;
  upsertMember: (member: { email: string; role: Role }) => Promise<unknown>;
  removeMember: (email: string) => Promise<unknown>;
}) {
  const { ipcMain } = args;

  ipcMain.handle("rina:team:get", async () => args.getTeam());
  ipcMain.handle("rina:team:setCurrentUser", async (_event, email: string) => args.setCurrentUser(email));
  ipcMain.handle("rina:team:upsertMember", async (_event, member: { email: string; role: Role }) =>
    args.upsertMember(member),
  );
  ipcMain.handle("rina:team:removeMember", async (_event, email: string) => args.removeMember(email));
}
