// @ts-nocheck
import { formatDiagnosisForChat, formatFindingsForChat, formatFixOptionsForChat, formatOutcomeForChat, normalizeRinaResponse, summarizeRinaOutput } from './chatDoctorFormatting.js';
import { classifyIntent } from './chatDoctorIntent.js';
import { doctorPlanForIpc } from './chatDoctorPlan.js';

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
