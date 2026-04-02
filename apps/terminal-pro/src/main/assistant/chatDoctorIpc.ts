import { formatDiagnosisForChat, formatFindingsForChat, formatFixOptionsForChat, formatOutcomeForChat, normalizeRinaResponse, summarizeRinaOutput } from './chatDoctorFormatting.js';
import { classifyIntent } from './chatDoctorIntent.js';
import { doctorPlanForIpc } from './chatDoctorPlan.js';
import type {
    ChatDoctorIpcHelpers,
    CreateChatDoctorIpcHelpersDeps,
} from '../startup/runtimeTypes.js';

export function createChatDoctorIpcHelpers(deps: CreateChatDoctorIpcHelpersDeps): ChatDoctorIpcHelpers {
    const {
        redactText,
        resolveProjectRootSafe,
        getDefaultCwd,
        defaultProfileForProject,
        loadProjectRules,
        rulesToSystemBlock,
        summarizeProfile,
        chatRouter,
        doctorGetTranscript,
        doctorExportTranscript,
    } = deps;
    const conversations = new Map();
    const chatHandle = typeof chatRouter === 'function' ? chatRouter : chatRouter.handle.bind(chatRouter);
    async function doctorTranscriptGetForIpc() {
        return doctorGetTranscript();
    }
    async function doctorTranscriptExportForIpc(format?: string) {
        return doctorExportTranscript(format);
    }
    function getConversation(win: unknown) {
        return conversations.get(win) ?? null;
    }
    function setConversation(win: unknown, state: unknown | null | undefined) {
        if (state) {
            conversations.set(win, state);
        }
        else {
            conversations.delete(win);
        }
    }
    async function chatSendForIpc(text: unknown, projectRoot?: string) {
        const safeText = redactText(String(text || '')).redactedText;
        const root = resolveProjectRootSafe(projectRoot || getDefaultCwd());
        const profile = defaultProfileForProject(root);
        const rules = loadProjectRules(root, { parentLevels: 2 });
        return await chatHandle(safeText, {
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
