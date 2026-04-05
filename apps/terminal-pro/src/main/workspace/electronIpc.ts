// @ts-nocheck
import type { WorkspaceElectronIpcHelperDeps } from '../startup/runtimeTypes.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

export function createWorkspaceElectronIpcHelpers(
  deps: WorkspaceElectronIpcHelperDeps
) {
    const { dialog, ptySessions, getDefaultCwd } = deps;
    function createDemoWorkspace() {
        const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-demo-fix-project-'));
        fs.writeFileSync(path.join(workspaceRoot, 'package.json'), JSON.stringify({
            name: 'rinawarp-demo-fix-project',
            version: '1.0.0',
            private: true,
            type: 'module',
            scripts: {
                build: 'node build.mjs'
            },
            dependencies: {
                kleur: '4.1.5'
            }
        }, null, 2), 'utf8');
        fs.writeFileSync(path.join(workspaceRoot, 'build.mjs'), [
            "import { green } from 'kleur/colors'",
            "console.log(green('Build successful'))",
            '',
        ].join('\n'), 'utf8');
        execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], {
            cwd: workspaceRoot,
            stdio: 'ignore',
        });
        fs.rmSync(path.join(workspaceRoot, 'node_modules'), { recursive: true, force: true });
        return workspaceRoot;
    }
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
        const resolvedPath = existing?.cwd || '';
        if (!resolvedPath) {
            return { ok: false };
        }
        return { ok: true, path: resolvedPath };
    }
    async function workspaceDemoForIpc() {
        try {
            const demoPath = createDemoWorkspace();
            return { ok: true, path: demoPath, source: 'demo' };
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    return {
        workspacePickForIpc,
        workspaceDefaultForIpc,
        workspaceDemoForIpc,
    };
}
