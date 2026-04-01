// @ts-nocheck
import { buildQueryString, createIdempotencyKey, encodePathParam, requestWithFallback } from './agentdRequestBuilders.js';
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
        return await requestWithFallback(agentdJson, '/v1/daemon/status', {
            method: 'GET',
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
            daemon: { running: false, pid: null, storeDir: null },
            tasks: { total: 0, counts: {} },
        }));
    }
    async function daemonTasks(args) {
        const suffix = buildQueryString({
            status: args?.status,
            deadLetter: args?.deadLetter,
        });
        return await requestWithFallback(agentdJson, `/v1/daemon/tasks${suffix}`, {
            method: 'GET',
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
            tasks: [],
        }));
    }
    async function daemonTaskAdd(args) {
        return await requestWithFallback(agentdJson, '/v1/daemon/tasks', {
            method: 'POST',
            body: {
                type: args?.type,
                payload: args?.payload ?? {},
                maxAttempts: args?.maxAttempts,
            },
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
    }
    async function daemonStart() {
        return await requestWithFallback(agentdJson, '/v1/daemon/start', {
            method: 'POST',
            body: {},
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
    }
    async function daemonStop() {
        return await requestWithFallback(agentdJson, '/v1/daemon/stop', {
            method: 'POST',
            body: {},
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
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
        return await requestWithFallback(agentdJson, '/v1/orchestrator/issue-to-pr', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
    }
    async function orchestratorGraphForIpc() {
        return await requestWithFallback(agentdJson, '/v1/orchestrator/workspace-graph', {
            method: 'GET',
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
            graph: { nodes: [], edges: [] },
        }));
    }
    async function orchestratorPrepareBranchForIpc(args) {
        return await requestWithFallback(agentdJson, '/v1/orchestrator/git/prepare-branch', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
    }
    async function orchestratorCreatePrForIpc(args) {
        return await requestWithFallback(agentdJson, '/v1/orchestrator/github/create-pr', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
    }
    async function orchestratorPrStatusForIpc(args) {
        return await requestWithFallback(agentdJson, '/v1/orchestrator/github/pr-status', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
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
            const path = `/v1/orchestrator/github/webhook-audit${buildQueryString({
                limit: args?.limit,
                outcome: args?.outcome,
                mapped: args?.mapped,
            })}`;
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
        return await requestWithFallback(agentdJson, '/v1/orchestrator/ci/status', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
    }
    async function orchestratorReviewCommentForIpc(args) {
        return await requestWithFallback(agentdJson, '/v1/orchestrator/review/comment', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
    }
    async function accountPlanForIpc() {
        return await requestWithFallback(agentdJson, '/v1/account/plan', {
            method: 'GET',
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            degraded: true,
            error,
            status: 'unknown',
            plan: 'unknown',
            seats_allowed: null,
            seats_used: null,
        }));
    }
    async function teamWorkspaceCreateForIpc(args) {
        return await requestWithFallback(agentdJson, '/v1/workspaces', {
            method: 'POST',
            body: args,
            includeLicenseToken: false,
            headers: {
                'Idempotency-Key': createIdempotencyKey('team-workspace'),
            },
        }, (error) => ({
            ok: false,
            error,
        }));
    }
    async function teamWorkspaceGetForIpc(workspaceId) {
        return await requestWithFallback(agentdJson, `/v1/workspaces/${encodePathParam(workspaceId)}`, {
            method: 'GET',
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
    }
    async function teamInvitesListForIpc(workspaceId) {
        return await requestWithFallback(agentdJson, `/v1/workspaces/${encodePathParam(workspaceId)}/invites`, {
            method: 'GET',
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
            invites: [],
        }));
    }
    async function teamInviteCreateForIpc(args) {
        const workspaceId = encodePathParam(args?.workspaceId);
        return await requestWithFallback(agentdJson, `/v1/workspaces/${workspaceId}/invites`, {
            method: 'POST',
            body: {
                email: args?.email,
                role: args?.role,
                expires_in_hours: args?.expiresInHours,
                send_email: args?.sendEmail,
            },
            includeLicenseToken: false,
            headers: {
                'Idempotency-Key': createIdempotencyKey('team-invite'),
            },
        }, (error) => ({
            ok: false,
            error,
        }));
    }
    async function teamInviteRevokeForIpc(inviteId) {
        return await requestWithFallback(agentdJson, `/v1/invites/${encodePathParam(inviteId)}/revoke`, {
            method: 'POST',
            body: {},
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
    }
    async function teamAuditListForIpc(args) {
        const suffix = buildQueryString({
            type: args?.type,
            from: args?.from,
            to: args?.to,
            limit: args?.limit,
        });
        return await requestWithFallback(agentdJson, `/v1/workspaces/${encodePathParam(args?.workspaceId)}/audit${suffix}`, {
            method: 'GET',
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
            entries: [],
        }));
    }
    async function teamBillingEnforcementForIpc(args) {
        return await requestWithFallback(agentdJson, `/v1/workspaces/${encodePathParam(args?.workspaceId)}/billing/enforce`, {
            method: 'PUT',
            body: {
                require_active_plan: args?.requireActivePlan === true,
            },
            includeLicenseToken: false,
        }, (error) => ({
            ok: false,
            error,
        }));
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
        accountPlanForIpc,
        teamWorkspaceCreateForIpc,
        teamWorkspaceGetForIpc,
        teamInvitesListForIpc,
        teamInviteCreateForIpc,
        teamInviteRevokeForIpc,
        teamAuditListForIpc,
        teamBillingEnforcementForIpc,
    };
}
