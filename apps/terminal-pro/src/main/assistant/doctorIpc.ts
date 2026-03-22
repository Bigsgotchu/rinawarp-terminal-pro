// @ts-nocheck
export function createDoctorIpcHelpers(deps) {
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
        getDefaultPtyCwd,
        gateProfileCommand,
    } = deps;
    async function doctorInspectForIpc(intent) {
        return await doctorInspect(intent);
    }
    async function doctorCollectForIpc(steps, _streamCallback) {
        for (const step of Array.isArray(steps) ? steps : []) {
            const command = step?.input?.command;
            if (typeof command !== 'string' || !command.trim())
                continue;
            const gate = evaluatePolicyGate(command, false, '');
            if (!gate.ok) {
                throw new Error(gate.message || `Blocked by policy: ${command}`);
            }
        }
        return await doctorCollect(steps, undefined);
    }
    async function doctorInterpretForIpc(payload) {
        const safePayload = {
            ...payload,
            intent: redactForModel(payload.intent),
            evidence: sanitizeForPersistence(payload.evidence),
        };
        return await doctorInterpret(safePayload);
    }
    async function doctorVerifyForIpc(payload) {
        const safePayload = {
            ...payload,
            intent: redactForModel(payload.intent),
            before: sanitizeForPersistence(payload.before),
            after: sanitizeForPersistence(payload.after),
            diagnosis: sanitizeForPersistence(payload.diagnosis),
        };
        return await doctorVerify(safePayload);
    }
    async function doctorExecuteFixForIpc(plan, confirmed, confirmationText) {
        const steps = Array.isArray(plan?.steps) ? plan.steps : [];
        const explicitCwd = steps.find((step) => typeof step?.input?.cwd === 'string' && step.input.cwd.trim())?.input?.cwd;
        const projectRoot = resolveProjectRootSafe(explicitCwd || getDefaultPtyCwd());
        for (const step of steps) {
            const command = step?.input?.command;
            if (typeof command !== 'string' || !command.trim())
                continue;
            const stepRisk = step?.risk === 'high-impact' ? 'high-impact' : step?.risk === 'read' ? 'read' : 'safe-write';
            const profileGate = gateProfileCommand({
                projectRoot,
                command,
                risk: stepRisk,
                confirmed,
                confirmationText: confirmationText ?? '',
            });
            if (!profileGate.ok) {
                return { ok: false, haltedBecause: profileGate.message, steps: [] };
            }
            const gate = evaluatePolicyGate(command, confirmed, confirmationText ?? '');
            if (!gate.ok) {
                return { ok: false, haltedBecause: gate.message || 'Blocked by policy.', steps: [] };
            }
        }
        return await doctorExecuteFix(plan, confirmed, confirmationText);
    }
    return {
        doctorInspectForIpc,
        doctorCollectForIpc,
        doctorInterpretForIpc,
        doctorVerifyForIpc,
        doctorExecuteFixForIpc,
    };
}
