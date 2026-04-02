// @ts-nocheck
export function registerTeamIpc(deps) {
    const {
        ipcMain,
        accountPlanForIpc,
        teamWorkspaceCreateForIpc,
        teamWorkspaceGetForIpc,
        teamInvitesListForIpc,
        teamInviteCreateForIpc,
        teamInviteRevokeForIpc,
        teamAuditListForIpc,
        teamBillingEnforcementForIpc,
        loadTeamDb,
        saveTeamDb,
        normalizeRole,
    } = deps;
    ipcMain.removeHandler('team:plan');
    ipcMain.handle('team:plan', async () => {
        return await accountPlanForIpc();
    });
    ipcMain.removeHandler('team:workspace:create');
    ipcMain.handle('team:workspace:create', async (_event, args) => {
        const created = await teamWorkspaceCreateForIpc(args || {});
        if (created?.workspace_id) {
            const existing = loadTeamDb();
            saveTeamDb({
                ...existing,
                workspaceId: String(created.workspace_id),
            });
        }
        return created;
    });
    ipcMain.removeHandler('team:workspace:set');
    ipcMain.handle('team:workspace:set', async (_event, workspaceId) => {
        const nextWorkspaceId = String(workspaceId || '').trim();
        if (!nextWorkspaceId) {
            return { ok: false, error: 'workspace_id_required' };
        }
        const existing = loadTeamDb();
        const next = saveTeamDb({
            ...existing,
            workspaceId: nextWorkspaceId,
        });
        return { ok: true, workspaceId: next.workspaceId };
    });
    ipcMain.removeHandler('team:workspace:get');
    ipcMain.handle('team:workspace:get', async (_event, workspaceId) => {
        const requested = String(workspaceId || '').trim() || String(loadTeamDb()?.workspaceId || '').trim();
        if (!requested) {
            return { ok: false, error: 'workspace_id_required' };
        }
        const workspace = await teamWorkspaceGetForIpc(requested);
        if (workspace?.id || workspace?.workspace_id) {
            const existing = loadTeamDb();
            saveTeamDb({
                ...existing,
                workspaceId: requested,
                seatsAllowed: Number(workspace?.seats_allowed || existing?.seatsAllowed || 1),
            });
        }
        return workspace;
    });
    ipcMain.removeHandler('team:invites:list');
    ipcMain.handle('team:invites:list', async (_event, workspaceId) => {
        const requested = String(workspaceId || '').trim() || String(loadTeamDb()?.workspaceId || '').trim();
        if (!requested) {
            return { ok: false, error: 'workspace_id_required', invites: [] };
        }
        return await teamInvitesListForIpc(requested);
    });
    ipcMain.removeHandler('team:invite:create');
    ipcMain.handle('team:invite:create', async (_event, args) => {
        const existing = loadTeamDb();
        const workspaceId = String(args?.workspaceId || existing?.workspaceId || '').trim();
        if (!workspaceId) {
            return { ok: false, error: 'workspace_id_required' };
        }
        return await teamInviteCreateForIpc({
            workspaceId,
            email: String(args?.email || '').trim(),
            role: normalizeRole(args?.role),
            expiresInHours: Number(args?.expiresInHours || 72),
            sendEmail: args?.sendEmail === true,
        });
    });
    ipcMain.removeHandler('team:invite:revoke');
    ipcMain.handle('team:invite:revoke', async (_event, inviteId) => {
        return await teamInviteRevokeForIpc(inviteId);
    });
    ipcMain.removeHandler('team:audit:list');
    ipcMain.handle('team:audit:list', async (_event, args) => {
        const existing = loadTeamDb();
        const workspaceId = String(args?.workspaceId || existing?.workspaceId || '').trim();
        if (!workspaceId) {
            return { ok: false, error: 'workspace_id_required', entries: [] };
        }
        return await teamAuditListForIpc({
            workspaceId,
            type: args?.type,
            from: args?.from,
            to: args?.to,
            limit: args?.limit,
        });
    });
    ipcMain.removeHandler('team:billing:setEnforcement');
    ipcMain.handle('team:billing:setEnforcement', async (_event, args) => {
        const existing = loadTeamDb();
        const workspaceId = String(args?.workspaceId || existing?.workspaceId || '').trim();
        if (!workspaceId) {
            return { ok: false, error: 'workspace_id_required' };
        }
        return await teamBillingEnforcementForIpc({
            workspaceId,
            requireActivePlan: args?.requireActivePlan === true,
        });
    });
}
