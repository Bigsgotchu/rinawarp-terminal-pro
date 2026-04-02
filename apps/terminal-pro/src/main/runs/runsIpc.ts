// @ts-nocheck
import type { RunsIpcHelperDeps } from '../startup/runtimeTypes.js'

export function createRunsIpcHelpers(deps: RunsIpcHelperDeps) {
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
    function readJsonSafe(filePath, fallback = null) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        catch {
            return fallback;
        }
    }
    function parseCommandReceipt(commandsFile, requestedReceiptId) {
        const lines = fs.readFileSync(commandsFile, 'utf8').split(/\r?\n/).filter(line => line.trim());
        const starts = new Map();
        const ends = new Map();
        for (const line of lines) {
            try {
                const row = JSON.parse(line);
                const id = String(row.id || '').trim();
                if (!id)
                    continue;
                if (row.ended_at)
                    ends.set(id, row);
                else
                    starts.set(id, row);
            }
            catch {
                continue;
            }
        }
        const orderedStarts = Array.from(starts.values()).sort((left, right) => String(right.started_at || '').localeCompare(String(left.started_at || '')));
        const requestedId = String(requestedReceiptId || '').trim();
        const start = (requestedId && starts.get(requestedId)) || orderedStarts[0] || null;
        if (!start)
            return null;
        return {
            start,
            end: ends.get(String(start.id || '')) || null,
            starts: orderedStarts,
            rowsCount: lines.length,
        };
    }
    function extractUrls(text) {
        return Array.from(new Set(String(text || '').match(/https?:\/\/[^\s<>"')\]]+/g) || [])).map(value => value.replace(/[.,;:]+$/, ''));
    }
    function buildStructuredReceipt(receiptId, commandsFile, sessionsRoot) {
        const sessionId = path.basename(path.dirname(commandsFile));
        const parsed = parseCommandReceipt(commandsFile, receiptId);
        if (!parsed)
            return null;
        const sessionMeta = readJsonSafe(path.join(path.dirname(commandsFile), 'session.json'), {});
        const commandId = String(parsed.start.id || '').trim();
        const artifactSummary = commandId
            ? summarizeStructuredRunArtifactsFromSessionsRoot(sessionsRoot, { sessionId, runId: commandId })
            : {
                stdoutChunks: 0,
                stderrChunks: 0,
                metaChunks: 0,
                stdoutPreview: '',
                stderrPreview: '',
                metaPreview: '',
                changedFiles: [],
                diffHints: [],
            };
        const combinedPreview = [artifactSummary.stdoutPreview, artifactSummary.stderrPreview, artifactSummary.metaPreview].filter(Boolean).join('\n');
        return {
            kind: 'structured_command_receipt',
            id: commandId || sessionId,
            sessionId,
            commandId,
            intent: String(parsed.start.input || ''),
            session: {
                id: sessionId,
                createdAt: sessionMeta?.createdAt || null,
                updatedAt: sessionMeta?.updatedAt || null,
                projectRoot: sessionMeta?.projectRoot || null,
                source: sessionMeta?.source || null,
                platform: sessionMeta?.platform || null,
            },
            command: {
                id: commandId || null,
                input: parsed.start.input || '',
                cwd: parsed.start.cwd || null,
                risk: parsed.start.risk || null,
                startedAt: parsed.start.started_at || null,
                endedAt: parsed.end?.ended_at || null,
                ok: typeof parsed.end?.ok === 'boolean' ? parsed.end.ok : null,
                exitCode: typeof parsed.end?.exit_code === 'number' ? parsed.end.exit_code : null,
                cancelled: Boolean(parsed.end?.cancelled),
                error: parsed.end?.error || null,
            },
            artifacts: {
                ...artifactSummary,
                urls: extractUrls(combinedPreview),
            },
            rowsCount: parsed.rowsCount,
            commandCount: parsed.starts.length,
        };
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
            const sessionsRoot = structuredSessionsRoot();
            let receipt;
            if (targetPath.endsWith('commands.ndjson')) {
                receipt = buildStructuredReceipt(receiptId, targetPath, sessionsRoot);
            }
            if (!receipt) {
                const content = fs.readFileSync(targetPath, 'utf8');
                if (targetPath.endsWith('.json')) {
                    receipt = JSON.parse(content);
                } else if (targetPath.endsWith('.ndjson')) {
                    const lines = content.split(/\r?\n/).filter(line => line.trim());
                    receipt = lines.map(line => JSON.parse(line));
                } else {
                    receipt = { raw: content };
                }
            }
            return { ok: true, receipt };
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
