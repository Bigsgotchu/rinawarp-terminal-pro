// @ts-nocheck
import type { WorkspaceElectronIpcHelperDeps } from '../startup/runtimeTypes.js'

export function createWorkspaceElectronIpcHelpers(
  deps: WorkspaceElectronIpcHelperDeps
) {
    const { dialog, ptySessions, getDefaultCwd } = deps;
    async function workspacePickForIpc() {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Workspace Folder',
            buttonLabel: 'Select',
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { ok: false };
        }
        return { ok: true, path: result.filePaths[0] };
    }
    async function workspaceDefaultForIpc(senderId) {
        const existing = ptySessions.get(senderId);
        const path = existing?.cwd || getDefaultCwd();
        return { ok: true, path };
    }
    return {
        workspacePickForIpc,
        workspaceDefaultForIpc,
    };
}
