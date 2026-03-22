// @ts-nocheck
export function createWorkspaceCodeHelpers(deps) {
    const {
        appProjectRoot,
        dialog,
        fs,
        path,
        ptySessions,
        normalizeProjectRoot,
        resolveProjectRootSafe,
        canonicalizePath,
        isWithinRoot,
    } = deps;
    const CODE_EXPLORER_SKIP_DIRS = new Set([
        '.git',
        'node_modules',
        'dist',
        'dist-electron',
        '.next',
        '.turbo',
        '.cache',
        'coverage',
    ]);
    function looksLikeAppBundlePath(candidate) {
        const normalized = String(candidate || '').replace(/\\/g, '/');
        return normalized.includes('/app.asar') || normalized.includes('/dist-electron/installer/') || normalized.includes('/resources/');
    }
    function getDefaultPtyCwd() {
        const explicitWorkspaceRoot = String(process.env.RINA_WORKSPACE_ROOT || '').trim();
        if (explicitWorkspaceRoot) {
            return resolveProjectRootSafe(explicitWorkspaceRoot);
        }
        const currentWorkingDir = String(process.cwd() || '').trim();
        if (currentWorkingDir && !looksLikeAppBundlePath(currentWorkingDir)) {
            try {
                return resolveProjectRootSafe(currentWorkingDir);
            }
            catch {
                return currentWorkingDir;
            }
        }
        const homeDir = String(process.env.HOME || '').trim();
        if (homeDir && !looksLikeAppBundlePath(homeDir)) {
            try {
                return resolveProjectRootSafe(homeDir);
            }
            catch {
                return homeDir;
            }
        }
        try {
            return resolveProjectRootSafe(appProjectRoot);
        }
        catch {
            return appProjectRoot;
        }
    }
    function resolvePtyCwd(input) {
        if (!input || !input.trim())
            return getDefaultPtyCwd();
        try {
            return normalizeProjectRoot(input);
        }
        catch {
            return getDefaultPtyCwd();
        }
    }
    function listProjectFilesSafe(projectRoot, limit = 800) {
        const safeRoot = normalizeProjectRoot(projectRoot);
        const out = [];
        const max = Math.max(50, Math.min(Number(limit || 800), 5000));
        const stack = [safeRoot];
        while (stack.length > 0 && out.length < max) {
            const dir = stack.pop();
            let entries = [];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            }
            catch {
                continue;
            }
            for (const ent of entries) {
                if (ent.name.startsWith('.')) {
                    if (!['.env.example', '.env.local.example'].includes(ent.name))
                        continue;
                }
                const full = path.join(dir, ent.name);
                if (!isWithinRoot(full, safeRoot))
                    continue;
                if (ent.isDirectory()) {
                    if (CODE_EXPLORER_SKIP_DIRS.has(ent.name))
                        continue;
                    stack.push(full);
                    continue;
                }
                if (!ent.isFile())
                    continue;
                out.push(path.relative(safeRoot, full));
                if (out.length >= max)
                    break;
            }
        }
        out.sort((a, b) => a.localeCompare(b));
        return out;
    }
    function readProjectFileSafe(args) {
        const safeRoot = normalizeProjectRoot(args.projectRoot);
        const rel = String(args.relativePath || '')
            .replace(/\\/g, '/')
            .trim();
        if (!rel || rel.includes('\0'))
            return { ok: false, error: 'Invalid file path' };
        const full = canonicalizePath(path.resolve(safeRoot, rel));
        if (!isWithinRoot(full, safeRoot))
            return { ok: false, error: 'File is outside workspace root' };
        if (!fs.existsSync(full) || !fs.statSync(full).isFile())
            return { ok: false, error: 'File not found' };
        const max = Math.max(1024, Math.min(Number(args.maxBytes || 120_000), 2_000_000));
        const buf = fs.readFileSync(full);
        const raw = buf.subarray(0, max);
        const content = raw.toString('utf8');
        const looksBinary = content.includes('\u0000');
        if (looksBinary) {
            return {
                ok: true,
                content: '[binary file preview not available]',
                truncated: buf.length > max,
            };
        }
        return {
            ok: true,
            content,
            truncated: buf.length > max,
        };
    }
    async function workspacePickDirectoryForIpc() {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Project Root',
            buttonLabel: 'Select Folder',
        });
        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0];
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
        const path = existing?.cwd || getDefaultPtyCwd();
        return { ok: true, path };
    }
    async function codeListFilesForIpc(args) {
        try {
            const projectRoot = resolveProjectRootSafe(args?.projectRoot);
            const files = listProjectFilesSafe(projectRoot, args?.limit);
            return { ok: true, files };
        }
        catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    async function codeReadFileForIpc(args) {
        try {
            const projectRoot = resolveProjectRootSafe(args?.projectRoot);
            return readProjectFileSafe({
                projectRoot,
                relativePath: String(args?.relativePath || ''),
                maxBytes: args?.maxBytes,
            });
        }
        catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    return {
        getDefaultPtyCwd,
        resolvePtyCwd,
        listProjectFilesSafe,
        readProjectFileSafe,
        workspacePickDirectoryForIpc,
        workspacePickForIpc,
        workspaceDefaultForIpc,
        codeListFilesForIpc,
        codeReadFileForIpc,
    };
}
