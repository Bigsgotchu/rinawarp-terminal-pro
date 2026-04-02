import type {
    CreateDoctorIpcHelpersDeps,
    DoctorFixPlan,
    DoctorFixPlanStep,
    DoctorIpcHelpers,
} from '../startup/runtimeTypes.js';

function sanitizeInterpretPayload(payload: { intent: string; evidence: unknown; [key: string]: unknown; }, redactForModel: CreateDoctorIpcHelpersDeps['redactForModel'], sanitizeForPersistence: CreateDoctorIpcHelpersDeps['sanitizeForPersistence']) {
    return {
        ...payload,
        intent: redactForModel(payload.intent),
        evidence: sanitizeForPersistence(payload.evidence),
    };
}
function sanitizeVerifyPayload(payload: { intent: string; before: unknown; after: unknown; diagnosis: unknown; [key: string]: unknown; }, redactForModel: CreateDoctorIpcHelpersDeps['redactForModel'], sanitizeForPersistence: CreateDoctorIpcHelpersDeps['sanitizeForPersistence']) {
    return {
        ...payload,
        intent: redactForModel(payload.intent),
        before: sanitizeForPersistence(payload.before),
        after: sanitizeForPersistence(payload.after),
        diagnosis: sanitizeForPersistence(payload.diagnosis),
    };
}
function getPlanSteps(plan: DoctorFixPlan) {
    return Array.isArray(plan?.steps) ? plan.steps : [];
}
function getProjectRootForPlan(steps: DoctorFixPlanStep[], resolveProjectRootSafe: CreateDoctorIpcHelpersDeps['resolveProjectRootSafe'], getDefaultCwd: CreateDoctorIpcHelpersDeps['getDefaultCwd']) {
    const explicitCwd = steps.find((step) => typeof step?.input?.cwd === 'string' && step.input.cwd.trim())?.input?.cwd;
    return resolveProjectRootSafe(explicitCwd || getDefaultCwd());
}
function assertCollectStepsAllowed(steps: unknown, evaluatePolicyGate: CreateDoctorIpcHelpersDeps['evaluatePolicyGate']) {
    for (const step of Array.isArray(steps) ? steps : []) {
        const command = typeof step === 'object' && step ? (step as DoctorFixPlanStep).input?.command : undefined;
        if (typeof command !== 'string' || !command.trim())
            continue;
        const gate = evaluatePolicyGate(command, false, '');
        if (!gate.ok) {
            throw new Error(gate.message || `Blocked by policy: ${command}`);
        }
    }
}
function normalizeStepRisk(step: DoctorFixPlanStep): 'read' | 'safe-write' | 'high-impact' {
    if (step?.risk === 'high-impact')
        return 'high-impact';
    if (step?.risk === 'read')
        return 'read';
    return 'safe-write';
}
function validateFixPlanSteps(steps: DoctorFixPlanStep[], projectRoot: string, confirmed: boolean, confirmationText: string, gateProfileCommand: CreateDoctorIpcHelpersDeps['gateProfileCommand'], evaluatePolicyGate: CreateDoctorIpcHelpersDeps['evaluatePolicyGate']) {
    for (const step of steps) {
        const command = step?.input?.command;
        if (typeof command !== 'string' || !command.trim())
            continue;
        const profileGate = gateProfileCommand({
            projectRoot,
            command,
            risk: normalizeStepRisk(step),
            confirmed,
            confirmationText,
        });
        if (!profileGate.ok) {
            return { ok: false, haltedBecause: profileGate.message, steps: [] };
        }
        const gate = evaluatePolicyGate(command, confirmed, confirmationText);
        if (!gate.ok) {
            return { ok: false, haltedBecause: gate.message || 'Blocked by policy.', steps: [] };
        }
    }
    return null;
}
export function createDoctorIpcHelpers(deps: CreateDoctorIpcHelpersDeps): DoctorIpcHelpers {
    const {
        doctorInspect,
        doctorCollect,
        doctorInterpret,
        doctorVerify,
        doctorExecuteFix,
        evaluatePolicyGate,
        redactForModel,
        sanitizeForPersistence,
        resolveProjectRootSafe,
        getDefaultCwd,
        gateProfileCommand,
    } = deps;
    async function doctorInspectForIpc(intent: unknown) {
        return doctorInspect(intent);
    }
    async function doctorCollectForIpc(steps: unknown, streamCallback?: unknown) {
        assertCollectStepsAllowed(steps, evaluatePolicyGate);
        return doctorCollect(steps, streamCallback);
    }
    async function doctorInterpretForIpc(payload: Parameters<DoctorIpcHelpers['doctorInterpretForIpc']>[0]) {
        return doctorInterpret(sanitizeInterpretPayload(payload, redactForModel, sanitizeForPersistence));
    }
    async function doctorVerifyForIpc(payload: Parameters<DoctorIpcHelpers['doctorVerifyForIpc']>[0]) {
        return doctorVerify(sanitizeVerifyPayload(payload, redactForModel, sanitizeForPersistence));
    }
    async function doctorExecuteFixForIpc(plan: DoctorFixPlan, confirmed: boolean, confirmationText?: string) {
        const safeConfirmationText = confirmationText ?? '';
        const steps = getPlanSteps(plan);
        const projectRoot = getProjectRootForPlan(steps, resolveProjectRootSafe, getDefaultCwd);
        const blocked = validateFixPlanSteps(steps, projectRoot, confirmed, safeConfirmationText, gateProfileCommand, evaluatePolicyGate);
        if (blocked) {
            return blocked;
        }
        return doctorExecuteFix(plan, confirmed, confirmationText);
    }
    return {
        doctorInspectForIpc,
        doctorCollectForIpc,
        doctorInterpretForIpc,
        doctorVerifyForIpc,
        doctorExecuteFixForIpc,
    };
}
