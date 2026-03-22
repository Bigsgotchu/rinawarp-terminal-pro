// @ts-nocheck
export function createAgentdIpcWrappers(deps) {
    const {
        agentdJson,
        isE2E,
        makePlan,
        terminalWriteSafetyFields,
        e2ePlanPayloads,
        getCurrentRole,
        hasRoleAtLeast,
    } = deps;
    async function daemonStatus() {
        try {
            return await agentdJson('/v1/daemon/status', {
                method: 'GET',
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
                daemon: { running: false, pid: null, storeDir: null },
                tasks: { total: 0, counts: {} },
            };
        }
    }
    async function daemonTasks(args) {
        const q = new URLSearchParams();
        if (args?.status)
            q.set('status', args.status);
        if (args?.deadLetter)
            q.set('deadLetter', '1');
        const suffix = q.size > 0 ? `?${q.toString()}` : '';
        try {
            return await agentdJson(`/v1/daemon/tasks${suffix}`, {
                method: 'GET',
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
                tasks: [],
            };
        }
    }
    async function daemonTaskAdd(args) {
        try {
            return await agentdJson('/v1/daemon/tasks', {
                method: 'POST',
                body: {
                    type: args?.type,
                    payload: args?.payload ?? {},
                    maxAttempts: args?.maxAttempts,
                },
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async function daemonStart() {
        try {
            return await agentdJson('/v1/daemon/start', {
                method: 'POST',
                body: {},
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async function daemonStop() {
        try {
            return await agentdJson('/v1/daemon/stop', {
                method: 'POST',
                body: {},
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async function fetchRemotePlanForIpc(payload) {
        if (isE2E) {
            const localPlan = makePlan(payload.intentText, payload.projectRoot);
            return {
                id: localPlan.id,
                reasoning: localPlan.reasoning,
                steps: localPlan.steps.map((step) => ({
                    stepId: step.id,
                    tool: 'terminal.write',
                    input: {
                        command: step.command,
                        cwd: payload.projectRoot,
                        timeoutMs: 60_000,
                    },
                    ...terminalWriteSafetyFields(step.risk),
                    description: step.description ?? step.command,
                    verification_plan: { steps: [] },
                })),
            };
        }
        const resp = await agentdJson('/v1/plan', {
            method: 'POST',
            body: payload,
            includeLicenseToken: false,
        });
        return resp.plan;
    }
    async function executeRemotePlanForIpc(payload) {
        if (isE2E) {
            const planRunId = `e2e_plan_${Date.now()}_${Math.random().toString(16).slice(2)}`;
            e2ePlanPayloads.set(planRunId, payload);
            return { ok: true, planRunId };
        }
        return await agentdJson('/v1/execute-plan', {
            method: 'POST',
            body: payload,
            includeLicenseToken: true,
        });
    }
    async function orchestratorIssueToPrForIpc(args) {
        try {
            return await agentdJson('/v1/orchestrator/issue-to-pr', {
                method: 'POST',
                body: args,
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async function orchestratorGraphForIpc() {
        try {
            return await agentdJson('/v1/orchestrator/workspace-graph', {
                method: 'GET',
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
                graph: { nodes: [], edges: [] },
            };
        }
    }
    async function orchestratorPrepareBranchForIpc(args) {
        try {
            return await agentdJson('/v1/orchestrator/git/prepare-branch', {
                method: 'POST',
                body: args,
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async function orchestratorCreatePrForIpc(args) {
        try {
            return await agentdJson('/v1/orchestrator/github/create-pr', {
                method: 'POST',
                body: args,
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async function orchestratorPrStatusForIpc(args) {
        try {
            return await agentdJson('/v1/orchestrator/github/pr-status', {
                method: 'POST',
                body: args,
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async function orchestratorWebhookAuditForIpc(args) {
        try {
            const role = getCurrentRole();
            if (!hasRoleAtLeast(role, 'operator')) {
                return {
                    ok: false,
                    error: 'Only owner/operator can access webhook audit events.',
                    entries: [],
                    count: 0,
                };
            }
            const params = new URLSearchParams();
            if (typeof args?.limit === 'number' && Number.isFinite(args.limit))
                params.set('limit', String(args.limit));
            if (args?.outcome)
                params.set('outcome', args.outcome);
            if (args?.mapped)
                params.set('mapped', args.mapped);
            const qs = params.toString();
            const path = qs ? `/v1/orchestrator/github/webhook-audit?${qs}` : '/v1/orchestrator/github/webhook-audit';
            return await agentdJson(path, {
                method: 'GET',
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
                entries: [],
                count: 0,
            };
        }
    }
    async function orchestratorCiStatusForIpc(args) {
        try {
            return await agentdJson('/v1/orchestrator/ci/status', {
                method: 'POST',
                body: args,
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async function orchestratorReviewCommentForIpc(args) {
        try {
            return await agentdJson('/v1/orchestrator/review/comment', {
                method: 'POST',
                body: args,
                includeLicenseToken: false,
            });
        }
        catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    return {
        daemonStatus,
        daemonTasks,
        daemonTaskAdd,
        daemonStart,
        daemonStop,
        fetchRemotePlanForIpc,
        executeRemotePlanForIpc,
        orchestratorIssueToPrForIpc,
        orchestratorGraphForIpc,
        orchestratorPrepareBranchForIpc,
        orchestratorCreatePrForIpc,
        orchestratorPrStatusForIpc,
        orchestratorWebhookAuditForIpc,
        orchestratorCiStatusForIpc,
        orchestratorReviewCommentForIpc,
    };
}
