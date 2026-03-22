// @ts-nocheck
export function createSessionHelpers(deps) {
    const { redactText, getStructuredSessionStore, sessionState } = deps;
    function withStructuredSessionWrite(fn) {
        if (!getStructuredSessionStore())
            return;
        try {
            fn();
        }
        catch {
        }
    }
    function ensureStructuredSession(args) {
        const store = getStructuredSessionStore();
        if (!store)
            return null;
        try {
            return store.startSession(args);
        }
        catch {
            return null;
        }
    }
    function sanitizeForPersistence(value) {
        if (typeof value === 'string') {
            return redactText(value).redactedText;
        }
        if (Array.isArray(value)) {
            return value.map((v) => sanitizeForPersistence(v));
        }
        if (value && typeof value === 'object') {
            const out = {};
            for (const [k, v] of Object.entries(value)) {
                out[k] = sanitizeForPersistence(v);
            }
            return out;
        }
        return value;
    }
    function addTranscriptEntry(entry) {
        sessionState.entries.push(sanitizeForPersistence(entry));
    }
    function getSessionTranscript() {
        return {
            sessionId: sessionState.id,
            startTime: sessionState.startTime,
            endTime: new Date().toISOString(),
            entries: sessionState.entries,
            playbookResults: Object.fromEntries(sessionState.playbookResults),
        };
    }
    function exportTranscript(format) {
        const transcript = getSessionTranscript();
        if (format === 'json') {
            return redactText(JSON.stringify(transcript, null, 2)).redactedText;
        }
        let text = `RinaWarp Session Report\n`;
        text += `${'='.repeat(50)}\n`;
        text += `Session: ${transcript.sessionId}\n`;
        text += `Started: ${transcript.startTime}\n`;
        text += `Ended: ${transcript.endTime}\n\n`;
        let stepNum = 0;
        for (const entry of transcript.entries) {
            switch (entry.type) {
                case 'intent':
                    text += `\n## Intent\n${entry.intent}\n`;
                    break;
                case 'playbook':
                    text += `\n## Playbook: ${entry.playbookName}\n`;
                    break;
                case 'signal':
                    text += `\n## Signal Detected\n${entry.signal}\n→ ${entry.interpretation}\n`;
                    break;
                case 'plan':
                    text += `\n## Plan\n${entry.plan.reasoning}\n\n`;
                    entry.plan.steps.forEach((s, i) => {
                        text += `${i + 1}. [${s.risk}] ${s.command}\n`;
                    });
                    break;
                case 'approval':
                    text += `\n## Approval: ${entry.stepId}\n`;
                    text += `Command: ${entry.command}\n`;
                    text += `Risk: ${entry.risk}\n`;
                    text += `Approved: ${entry.approved ? 'Yes' : 'No'}\n`;
                    break;
                case 'execution_start':
                    stepNum++;
                    text += `\n## Step ${stepNum}: ${entry.command}\n`;
                    break;
                case 'execution_end':
                    text += `Result: ${entry.ok ? 'Success' : 'Failed: ' + (entry.error || 'unknown')}\n`;
                    break;
                case 'verification':
                    text += `\n## Verification: ${entry.check}\n`;
                    text += `Status: ${entry.status.toUpperCase()}\n`;
                    text += `Result: ${entry.result}\n`;
                    break;
                case 'outcome':
                    text += `\n## OUTCOME CARD\n`;
                    text += `Root Cause: ${entry.rootCause}\n`;
                    text += `Changes: ${entry.changes.join(', ')}\n`;
                    text += `Confidence: ${entry.confidence.toUpperCase()}\n`;
                    text += `\nEvidence Before:\n${entry.evidenceBefore}\n`;
                    text += `\nEvidence After:\n${entry.evidenceAfter}\n`;
                    break;
                case 'memory':
                    text += `\n## Memory Stored\nCategory: ${entry.category}\nKey: ${entry.key}\n`;
                    break;
            }
        }
        return redactText(text).redactedText;
    }
    return {
        withStructuredSessionWrite,
        ensureStructuredSession,
        sanitizeForPersistence,
        addTranscriptEntry,
        getSessionTranscript,
        exportTranscript,
    };
}
