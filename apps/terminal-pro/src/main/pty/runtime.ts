// @ts-nocheck
export function createPtyRuntimeHelpers(deps) {
    const {
        path,
        process,
        redactText,
        detectCommandBoundaries,
        getStructuredSessionStore,
        ensureStructuredSession,
        withStructuredSessionWrite,
        addTranscriptEntry,
        safeSend,
        ptyStreamOwners,
        ptySessions,
        ptyResizeTimers,
        webContents,
    } = deps;
    let ptyModulePromise = null;
    function redactChunkIfNeeded(text) {
        return redactText(String(text ?? '')).redactedText;
    }
    function forRendererDisplay(text) {
        return String(text ?? '');
    }
    function redactForModel(text) {
        return redactText(String(text ?? '')).redactedText;
    }
    function getPtyModule() {
        if (!ptyModulePromise) {
            ptyModulePromise = import('node-pty').then((mod) => mod).catch(() => null);
        }
        return ptyModulePromise;
    }
    function getDefaultShell() {
        if (process.platform === 'win32')
            return process.env.COMSPEC || 'cmd.exe';
        return process.env.SHELL || '/bin/bash';
    }
    function shellToKind(shell) {
        const s = path.basename(String(shell || '')).toLowerCase();
        if (s.includes('pwsh') || s.includes('powershell'))
            return 'pwsh';
        if (s.includes('fish'))
            return 'fish';
        if (s.includes('zsh'))
            return 'zsh';
        if (s.includes('bash'))
            return 'bash';
        return 'unknown';
    }
    function createStreamId() {
        return `st_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
    function createStableBoundaryStreamId(webContentsId, index) {
        return `pty_${webContentsId}_${index}_${Math.random().toString(16).slice(2, 10)}`;
    }
    function finalizePtyBoundaries(targetWebContents, session, flushAll = false) {
        const boundaries = detectCommandBoundaries(session.transcriptBuffer, session.shellKind);
        if (!boundaries.length)
            return;
        const limit = flushAll ? boundaries.length : Math.max(0, boundaries.length - 1);
        if (session.finalizedBoundaryCount >= limit)
            return;
        for (let i = session.finalizedBoundaryCount; i < limit; i += 1) {
            const b = boundaries[i];
            const command = String(b.command || '').trim();
            if (!command)
                continue;
            const streamId = createStableBoundaryStreamId(targetWebContents.id, i);
            ptyStreamOwners.set(streamId, targetWebContents.id);
            const sid = ensureStructuredSession({ source: 'pty_live_capture', projectRoot: session.cwd });
            withStructuredSessionWrite(() => {
                const store = getStructuredSessionStore();
                store?.beginCommand({
                    sessionId: sid || undefined,
                    streamId,
                    command,
                    cwd: session.cwd,
                    risk: 'read',
                    source: 'pty_live_capture',
                });
                store?.appendChunk(streamId, 'meta', redactChunkIfNeeded(`$ ${command}\n`));
                if (b.output)
                    store?.appendChunk(streamId, 'stdout', redactChunkIfNeeded(b.output));
                store?.endCommand({
                    streamId,
                    ok: true,
                    code: null,
                    cancelled: false,
                });
            });
            addTranscriptEntry({
                type: 'execution_start',
                timestamp: new Date().toISOString(),
                streamId,
                stepId: `pty_${i + 1}`,
                command,
            });
            addTranscriptEntry({
                type: 'execution_end',
                timestamp: new Date().toISOString(),
                streamId,
                ok: true,
            });
        }
        session.finalizedBoundaryCount = limit;
        if (session.transcriptBuffer.length > 500_000) {
            session.transcriptBuffer = session.transcriptBuffer.slice(-300_000);
            session.finalizedBoundaryCount = 0;
        }
        safeSend(targetWebContents, 'rina:pty:boundaryStats', {
            captured: session.finalizedBoundaryCount,
            shell: session.shellKind,
        });
    }
    function closePtyForWebContents(webContentsId) {
        const timer = ptyResizeTimers.get(webContentsId);
        if (timer) {
            clearTimeout(timer);
            ptyResizeTimers.delete(webContentsId);
        }
        const session = ptySessions.get(webContentsId);
        if (!session)
            return;
        const ptyProcess = session.proc;
        const activeWebContents = webContents.fromId(webContentsId);
        let processStillRunning = true;
        const exitHandler = () => {
            processStillRunning = false;
        };
        ptyProcess.onExit(exitHandler);
        try {
            ptyProcess.kill('SIGTERM');
        }
        catch {
            processStillRunning = false;
        }
        setTimeout(() => {
            if (processStillRunning) {
                try {
                    ptyProcess.kill('SIGKILL');
                }
                catch {
                }
            }
            ptyProcess.onExit(() => { });
            if (activeWebContents && !activeWebContents.isDestroyed()) {
                activeWebContents.send('rina:pty:terminated', { webContentsId });
            }
        }, 2000);
        for (const [streamId, ownerId] of ptyStreamOwners.entries()) {
            if (ownerId === webContentsId)
                ptyStreamOwners.delete(streamId);
        }
        ptySessions.delete(webContentsId);
    }
    return {
        redactChunkIfNeeded,
        forRendererDisplay,
        redactForModel,
        getPtyModule,
        getDefaultShell,
        shellToKind,
        finalizePtyBoundaries,
        closePtyForWebContents,
        createStreamId,
        createStableBoundaryStreamId,
    };
}
