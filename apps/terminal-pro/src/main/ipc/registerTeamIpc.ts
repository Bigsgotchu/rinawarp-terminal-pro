import type { IpcMain } from "electron";

type Role = "owner" | "operator" | "viewer";

export function registerTeamIpc(args: {
  ipcMain: IpcMain;
  getTeam: () => Promise<unknown>;
  getActivity: (args?: { limit?: number }) => Promise<unknown>;
  createInvite: (args: { email?: string; role?: Role; expiresHours?: number }) => Promise<unknown>;
  listInvites: (args?: { includeSecrets?: boolean }) => Promise<unknown>;
  acceptInvite: (args: { inviteCode?: string }) => Promise<unknown>;
  revokeInvite: (id: string) => Promise<unknown>;
  setCurrentUser: (email: string) => Promise<unknown>;
  upsertMember: (member: { email: string; role: Role }) => Promise<unknown>;
  removeMember: (email: string) => Promise<unknown>;
}) {
  const { ipcMain } = args;

  ipcMain.handle("rina:team:get", async () => args.getTeam());
  ipcMain.handle("rina:team:activity", async (_event, payload?: { limit?: number }) => args.getActivity(payload));
  ipcMain.handle(
    "rina:team:createInvite",
    async (_event, payload: { email?: string; role?: Role; expiresHours?: number }) => args.createInvite(payload),
  );
  ipcMain.handle("rina:team:listInvites", async (_event, payload?: { includeSecrets?: boolean }) => args.listInvites(payload));
  ipcMain.handle("rina:team:acceptInvite", async (_event, payload: { inviteCode?: string }) => args.acceptInvite(payload));
  ipcMain.handle("rina:team:revokeInvite", async (_event, id: string) => args.revokeInvite(id));
  ipcMain.handle("rina:team:setCurrentUser", async (_event, email: string) => args.setCurrentUser(email));
  ipcMain.handle("rina:team:upsertMember", async (_event, member: { email: string; role: Role }) =>
    args.upsertMember(member),
  );
  ipcMain.handle("rina:team:removeMember", async (_event, email: string) => args.removeMember(email));
}
