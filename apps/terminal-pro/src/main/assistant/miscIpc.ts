// @ts-nocheck
export function createMiscIpcHelpers(deps) {
    const { process, redactText, importShellHistory, diagnoseHotLinux, addTranscriptEntry, makePlan, playbooks } = deps;
    async function pingForIpc() {
        return { pong: true, timestamp: new Date().toISOString() };
    }
    async function historyImportForIpc(limit) {
        try {
            const data = importShellHistory(Number(limit || 300));
            return { ok: true, ...data };
        }
        catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    async function diagnoseHotForIpc() {
        if (process.platform === 'linux')
            return await diagnoseHotLinux();
        return { platform: process.platform, message: 'Tuned for Kali/Linux.' };
    }
    async function planForIpc(intent) {
        addTranscriptEntry({ type: 'intent', timestamp: new Date().toISOString(), intent });
        const plan = makePlan(intent);
        addTranscriptEntry({ type: 'plan', timestamp: new Date().toISOString(), plan });
        return plan;
    }
    async function playbooksGetForIpc() {
        return playbooks.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            signals: p.signals,
            fixOptions: p.fixOptions.map((f) => ({
                name: f.name,
                description: f.description,
                risk: f.risk,
            })),
        }));
    }
    async function playbookExecuteForIpc(playbookId, fixIndex) {
        const playbook = playbooks.find((p) => p.id === playbookId);
        if (!playbook)
            throw new Error('Playbook not found');
        const fix = playbook.fixOptions[fixIndex];
        if (!fix)
            throw new Error('Fix option not found');
        addTranscriptEntry({ type: 'playbook', timestamp: new Date().toISOString(), playbookId, playbookName: playbook.name });
        return {
            playbook,
            fix,
            steps: fix.commands.map((cmd, i) => ({
                id: `f${fixIndex}_s${i + 1}`,
                tool: 'terminal',
                command: cmd,
                risk: fix.risk,
                description: fix.verification,
            })),
        };
    }
    async function redactionPreviewForIpc(text) {
        const out = redactText(String(text || ''));
        return {
            redactedText: out.redactedText,
            hits: out.hits,
            redactionCount: out.hits.length,
        };
    }
    return {
        pingForIpc,
        historyImportForIpc,
        diagnoseHotForIpc,
        planForIpc,
        playbooksGetForIpc,
        playbookExecuteForIpc,
        redactionPreviewForIpc,
    };
}
