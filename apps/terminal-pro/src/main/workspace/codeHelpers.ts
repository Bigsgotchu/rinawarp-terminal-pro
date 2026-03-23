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
    const CODE_EXPLORER_PRIORITY_FILES = new Map([
        ['package.json', 140],
        ['package-lock.json', 110],
        ['pnpm-lock.yaml', 108],
        ['readme.md', 132],
        ['tsconfig.json', 124],
        ['vite.config.ts', 118],
        ['vite.config.js', 118],
        ['wrangler.toml', 116],
        ['electron-builder.yml', 116],
        ['electron-builder.json', 116],
        ['src/main.ts', 126],
        ['src/index.ts', 122],
        ['src/index.tsx', 122],
        ['src/app.ts', 118],
        ['src/app.tsx', 118],
        ['src/renderer.ts', 114],
        ['src/renderer/index.ts', 114],
        ['src/renderer/index.tsx', 114],
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
    function tokenizeSearch(value) {
        return String(value || '')
            .toLowerCase()
            .split(/[^a-z0-9_./:-]+/g)
            .map((token) => token.trim())
            .filter(Boolean)
            .slice(0, 12);
    }
    function scoreProjectFile(relativePath, query = '') {
        const normalizedPath = String(relativePath || '').replace(/\\/g, '/').toLowerCase();
        if (!normalizedPath)
            return Number.NEGATIVE_INFINITY;
        const segments = normalizedPath.split('/').filter(Boolean);
        const basename = segments[segments.length - 1] || normalizedPath;
        const depth = Math.max(0, segments.length - 1);
        let score = 0;
        const priorityScore = CODE_EXPLORER_PRIORITY_FILES.get(normalizedPath) ?? CODE_EXPLORER_PRIORITY_FILES.get(basename);
        if (priorityScore)
            score += priorityScore;
        if (depth === 0)
            score += 18;
        if (normalizedPath.startsWith('src/'))
            score += 24;
        if (normalizedPath.includes('/main/'))
            score += 22;
        if (normalizedPath.includes('/renderer/'))
            score += 16;
        if (normalizedPath.includes('/workspace/'))
            score += 14;
        if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(normalizedPath))
            score += 10;
        if (basename.startsWith('index.'))
            score += 9;
        if (basename.startsWith('app.') || basename.startsWith('main.'))
            score += 8;
        if (/(^|\/)(test|tests|__tests__|fixtures|mocks)(\/|$)/.test(normalizedPath))
            score -= 18;
        if (/\.(spec|test)\./.test(normalizedPath))
            score -= 14;
        if (/(^|\/)(docs|coverage|tmp|output|release)(\/|$)/.test(normalizedPath))
            score -= 12;
        if (/(^|\/)(scripts)(\/|$)/.test(normalizedPath))
            score -= 4;
        score -= depth * 2.25;
        const normalizedQuery = String(query || '').trim().toLowerCase();
        if (normalizedQuery) {
            const tokens = tokenizeSearch(normalizedQuery);
            let matchedTokens = 0;
            if (basename === normalizedQuery || normalizedPath === normalizedQuery)
                score += 160;
            else if (basename.startsWith(normalizedQuery))
                score += 92;
            else if (basename.includes(normalizedQuery))
                score += 70;
            else if (normalizedPath.includes(normalizedQuery))
                score += 48;
            for (const token of tokens) {
                if (basename === token) {
                    score += 34;
                    matchedTokens += 1;
                    continue;
                }
                if (segments.includes(token)) {
                    score += 26;
                    matchedTokens += 1;
                    continue;
                }
                if (basename.startsWith(token)) {
                    score += 21;
                    matchedTokens += 1;
                    continue;
                }
                if (basename.includes(token)) {
                    score += 16;
                    matchedTokens += 1;
                    continue;
                }
                if (normalizedPath.includes(token)) {
                    score += 9;
                    matchedTokens += 1;
                }
            }
            if (tokens.length > 0 && matchedTokens === tokens.length)
                score += 22;
            else if (matchedTokens === 0)
                score -= 18;
        }
        return Number(score.toFixed(4));
    }
    function sortProjectFiles(files, query = '') {
        return [...files].sort((left, right) => {
            const scoreDelta = scoreProjectFile(right, query) - scoreProjectFile(left, query);
            if (scoreDelta !== 0)
                return scoreDelta;
            return left.localeCompare(right);
        });
    }
    function listProjectFilesSafe(projectRoot, limit = 800, query = '') {
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
        return sortProjectFiles(out, query).slice(0, max);
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
            const files = listProjectFilesSafe(projectRoot, args?.limit, args?.query);
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
        scoreProjectFile,
        readProjectFileSafe,
        workspacePickDirectoryForIpc,
        workspacePickForIpc,
        workspaceDefaultForIpc,
        codeListFilesForIpc,
        codeReadFileForIpc,
    };
}
