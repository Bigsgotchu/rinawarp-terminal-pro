// @ts-nocheck
export function createChatDoctorIpcHelpers(deps) {
    const {
        redactText,
        resolveProjectRootSafe,
        getDefaultPtyCwd,
        defaultProfileForProject,
        loadProjectRules,
        rulesToSystemBlock,
        summarizeProfile,
        chatRouter,
        doctorGetTranscript,
        doctorExportTranscript,
        handleRinaMessage,
    } = deps;
    const conversations = new Map();
    async function doctorTranscriptGetForIpc() {
        return doctorGetTranscript();
    }
    async function doctorTranscriptExportForIpc(format) {
        return doctorExportTranscript(format);
    }
    function getConversation(win) {
        return conversations.get(win) ?? null;
    }
    function setConversation(win, state) {
        if (state) {
            conversations.set(win, state);
        }
        else {
            conversations.delete(win);
        }
    }
    function classifyIntent(text) {
        const s = text.toLowerCase();
        const doctorKeywords = [
            'running hot',
            'overheat',
            'slow',
            'disk',
            'wifi',
            'network',
            'temperature',
            'cpu',
            'memory',
            'fan',
            'thermal',
            'disk full',
            'no space',
            'connection',
            'port',
            'service',
        ];
        for (const kw of doctorKeywords) {
            if (s.includes(kw)) {
                return { type: 'system-doctor', confidence: 0.9, intent: text };
            }
        }
        const devKeywords = ['build', 'compile', 'error', 'failed', 'bug', 'crash', 'debug'];
        for (const kw of devKeywords) {
            if (s.includes(kw)) {
                return { type: 'dev-fixer', confidence: 0.7, intent: text };
            }
        }
        const builderKeywords = ['create', 'scaffold', 'project', 'setup', 'new file'];
        for (const kw of builderKeywords) {
            if (s.includes(kw)) {
                return { type: 'builder', confidence: 0.6, intent: text };
            }
        }
        return { type: 'chat', confidence: 0.5, intent: text };
    }
    function formatFindingsForChat(findings) {
        if (!findings?.length)
            return 'No significant issues found.';
        const critical = findings.filter((f) => f.severity === 'critical');
        const warnings = findings.filter((f) => f.severity === 'warn');
        const info = findings.filter((f) => f.severity === 'info');
        const parts = [];
        if (critical.length) {
            parts.push(`Critical: ${critical.map((f) => f.title).join(', ')}`);
        }
        if (warnings.length) {
            parts.push(`Warnings: ${warnings.map((f) => f.title).join(', ')}`);
        }
        if (info.length) {
            parts.push(`Info: ${info.map((f) => f.title).join(', ')}`);
        }
        return parts.join('\n');
    }
    function formatDiagnosisForChat(diagnosis) {
        if (!diagnosis?.primary)
            return 'Unable to determine root cause.';
        const p = diagnosis.primary;
        const conf = Math.round(p.probability * 100);
        let msg = `Most likely: ${p.label} (${conf}% confidence)\n`;
        if (diagnosis.notes) {
            msg += `\n${diagnosis.notes}`;
        }
        if (diagnosis.differential?.length) {
            msg += `\n\nOther possibilities: ${diagnosis.differential
                .slice(0, 3)
                .map((d) => `${d.label} (${Math.round(d.probability * 100)}%)`)
                .join(', ')}`;
        }
        return msg;
    }
    function formatFixOptionsForChat(fixOptions) {
        if (!fixOptions?.length)
            return 'No fix options available.';
        return fixOptions
            .map((opt, i) => {
            const riskIcon = opt.risk === 'high-impact' ? 'high' : opt.risk === 'safe-write' ? 'medium' : 'low';
            return `${i + 1}. ${riskIcon} ${opt.label} - ${opt.why || ''}\n   Expected: ${opt.expectedOutcome?.join(', ') || 'issue resolved'}`;
        })
            .join('\n\n');
    }
    function formatOutcomeForChat(outcome, verification) {
        const status = outcome?.status || (verification?.ok ? 'resolved' : 'unknown');
        let msg = `${status.toUpperCase()}`;
        if (outcome?.rootCause) {
            msg += `\nRoot cause: ${outcome.rootCause}`;
        }
        if (outcome?.confidence) {
            msg += `\nConfidence: ${Math.round(outcome.confidence * 100)}%`;
        }
        if (outcome?.preventionTips?.length) {
            msg += `\n\nPrevention: ${outcome.preventionTips.join(', ')}`;
        }
        return msg;
    }
    async function chatSendForIpc(text, projectRoot) {
        const safeText = redactText(String(text || '')).redactedText;
        const root = resolveProjectRootSafe(projectRoot || getDefaultPtyCwd());
        const profile = defaultProfileForProject(root);
        const rules = loadProjectRules(root, { parentLevels: 2 });
        return await chatRouter.handle(safeText, {
            projectRoot: root,
            rulesBlock: rulesToSystemBlock(rules),
            rulesWarnings: rules.warnings,
            profileSummary: summarizeProfile(profile),
        });
    }
    async function chatExportForIpc() {
        return doctorExportTranscript('text');
    }
    function summarizeRinaOutput(output) {
        if (typeof output === 'string')
            return output;
        if (!output || typeof output !== 'object')
            return '';
        const record = output;
        if (typeof record.message === 'string' && record.message.trim())
            return record.message;
        if (typeof record.summary === 'string' && record.summary.trim())
            return record.summary;
        if (Array.isArray(record.commands) && record.commands.length > 0) {
            return `Available commands: ${record.commands.map((value) => String(value)).join(', ')}`;
        }
        if (Array.isArray(record.results) && record.results.length > 0) {
            return record.results
                .map((value) => {
                if (!value || typeof value !== 'object')
                    return String(value);
                const item = value;
                const label = typeof item.command === 'string' ? item.command : typeof item.stepId === 'string' ? item.stepId : 'step';
                const status = item.success === true ? 'ok' : item.success === false ? 'failed' : 'done';
                return `${label}: ${status}`;
            })
                .join('\n');
        }
        try {
            return JSON.stringify(output, null, 2);
        }
        catch {
            return String(output);
        }
    }
    function normalizeRinaResponse(response) {
        const output = response.output;
        const plan = output && typeof output === 'object' && 'plan' in output
            ? output.plan
            : null;
        return {
            ok: response.ok,
            intent: response.intent,
            text: response.error || summarizeRinaOutput(output) || (response.ok ? 'Done.' : 'Something went wrong.'),
            actions: [],
            plan,
            blocked: response.blocked ?? false,
            requiresConfirmation: response.requiresConfirmation ?? false,
            rina: response,
        };
    }
    async function doctorPlanForIpc(args) {
        const steps = [
            { stepId: 'uptime', tool: 'terminal.write', input: { command: 'uptime', cwd: args.projectRoot } },
            {
                stepId: 'cpu_top',
                tool: 'terminal.write',
                input: { command: 'ps -Ao pid,ppid,%cpu,%mem,etime,comm --sort=-%cpu | head -n 15', cwd: args.projectRoot },
            },
            {
                stepId: 'mem_top',
                tool: 'terminal.write',
                input: { command: 'ps -Ao pid,ppid,%cpu,%mem,etime,comm --sort=-%mem | head -n 15', cwd: args.projectRoot },
            },
            { stepId: 'disk_df', tool: 'terminal.write', input: { command: 'df -h', cwd: args.projectRoot } },
            {
                stepId: 'disk_big',
                tool: 'terminal.write',
                input: { command: 'du -h -d 1 . 2>/dev/null | sort -h | tail -n 12', cwd: args.projectRoot },
            },
            {
                stepId: 'sensors',
                tool: 'terminal.write',
                input: { command: 'sensors 2>/dev/null || echo "sensors not available"', cwd: args.projectRoot },
            },
        ];
        return {
            id: `doctor_${Date.now()}`,
            intent: args.symptom,
            reasoning: "I'll collect read-only evidence first (CPU, memory, disk, sensors). No changes yet.",
            steps,
            playbookId: 'doctor.running_hot.v1',
        };
    }
    return {
        doctorTranscriptGetForIpc,
        doctorTranscriptExportForIpc,
        getConversation,
        setConversation,
        classifyIntent,
        formatFindingsForChat,
        formatDiagnosisForChat,
        formatFixOptionsForChat,
        formatOutcomeForChat,
        chatSendForIpc,
        chatExportForIpc,
        summarizeRinaOutput,
        normalizeRinaResponse,
        doctorPlanForIpc,
    };
}
