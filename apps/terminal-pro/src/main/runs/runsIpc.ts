// @ts-nocheck
export function createRunsIpcHelpers(deps) {
    const { app, fs, path, shell, listStructuredRunsFromSessionsRoot, readStructuredRunTailFromSessionsRoot, summarizeStructuredRunArtifactsFromSessionsRoot } = deps;
    function structuredSessionsRoot() {
        return path.join(app.getPath('userData'), 'structured-session-v1', 'sessions');
    }
    function structuredRunsRoot() {
        return path.join(app.getPath('userData'), 'structured-session-v1');
    }
    function findStructuredReceiptArtifact(receiptId) {
        const normalizedId = String(receiptId || '').trim();
        if (!normalizedId)
            return null;
        const sessionsRoot = structuredSessionsRoot();
        if (!fs.existsSync(sessionsRoot))
            return null;
        const directSessionDir = path.join(sessionsRoot, normalizedId);
        const directCommandsFile = path.join(directSessionDir, 'commands.ndjson');
        if (fs.existsSync(directCommandsFile))
            return directCommandsFile;
        const directSessionFile = path.join(directSessionDir, 'session.json');
        if (fs.existsSync(directSessionFile))
            return directSessionFile;
        const sessionEntries = fs.readdirSync(sessionsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
        for (const entry of sessionEntries) {
            const commandsFile = path.join(sessionsRoot, entry.name, 'commands.ndjson');
            if (!fs.existsSync(commandsFile))
                continue;
            try {
                const lines = fs.readFileSync(commandsFile, 'utf8').split(/\r?\n/);
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed)
                        continue;
                    const row = JSON.parse(trimmed);
                    if (String(row.id || '') === normalizedId)
                        return commandsFile;
                }
            }
            catch {
                continue;
            }
        }
        return null;
    }
    async function runsListForIpc(args) {
        try {
            const sessionsRoot = structuredSessionsRoot();
            const limit = Math.max(1, Math.min(Number(args?.limit || 24), 100));
            return { ok: true, runs: listStructuredRunsFromSessionsRoot(sessionsRoot, limit) };
        }
        catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    async function openRunsFolderForIpc() {
        try {
            const rootDir = structuredRunsRoot();
            fs.mkdirSync(rootDir, { recursive: true });
            const error = await shell.openPath(rootDir);
            if (error)
                return { ok: false, error, path: rootDir };
            return { ok: true, path: rootDir };
        }
        catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    async function revealRunReceiptForIpc(receiptId) {
        try {
            const targetPath = findStructuredReceiptArtifact(receiptId);
            if (!targetPath) {
                return {
                    ok: false,
                    error: `No structured receipt artifact found for "${String(receiptId || '').trim()}".`,
                };
            }
            shell.showItemInFolder(targetPath);
            return { ok: true, path: targetPath };
        }
        catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    async function runsTailForIpc(args) {
        try {
            const sessionsRoot = structuredSessionsRoot();
            const tail = readStructuredRunTailFromSessionsRoot(sessionsRoot, {
                sessionId: String(args?.sessionId || ''),
                runId: String(args?.runId || ''),
                maxLines: args?.maxLines,
                maxBytes: args?.maxBytes,
            });
            return {
                ok: true,
                runId: String(args?.runId || ''),
                sessionId: String(args?.sessionId || ''),
                tail,
            };
        }
        catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    async function runsArtifactsForIpc(args) {
        try {
            const sessionsRoot = structuredSessionsRoot();
            const summary = summarizeStructuredRunArtifactsFromSessionsRoot(sessionsRoot, {
                sessionId: String(args?.sessionId || ''),
                runId: String(args?.runId || ''),
            });
            return {
                ok: true,
                runId: String(args?.runId || ''),
                sessionId: String(args?.sessionId || ''),
                summary,
            };
        }
        catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    return {
        runsListForIpc,
        openRunsFolderForIpc,
        revealRunReceiptForIpc,
        runsTailForIpc,
        runsArtifactsForIpc,
    };
}
