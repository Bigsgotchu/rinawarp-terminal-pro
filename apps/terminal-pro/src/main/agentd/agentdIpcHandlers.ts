// @ts-nocheck

import { AGENTD_CHANNELS } from './agentdChannels.js'
import {
  buildQueryString,
  createIdempotencyKey,
  encodePathParam,
  requestWithFallback,
} from './agentdRequestBuilders.js'
import {
  accountPlanFallback,
  auditEntriesFallback,
  buildE2EPlan,
  buildE2EPlanExecutionResult,
  daemonStatusFallback,
  daemonTasksFallback,
  errorOnly,
  graphFallback,
  invitesFallback,
  webhookAuditDenied,
  webhookAuditFallback,
} from './agentdResponseMappers.js'

function createJsonGet(agentdJson, path, fallback) {
  return requestWithFallback(
    agentdJson,
    path,
    {
      method: 'GET',
      includeLicenseToken: false,
    },
    fallback,
  )
}

function createJsonPost(agentdJson, path, body, fallback, extraOptions = {}) {
  return requestWithFallback(
    agentdJson,
    path,
    {
      method: 'POST',
      body,
      includeLicenseToken: false,
      ...extraOptions,
    },
    fallback,
  )
}

function createJsonPut(agentdJson, path, body, fallback, extraOptions = {}) {
  return requestWithFallback(
    agentdJson,
    path,
    {
      method: 'PUT',
      body,
      includeLicenseToken: false,
      ...extraOptions,
    },
    fallback,
  )
}

export function createDaemonIpcHandlers(deps) {
  const { agentdJson } = deps

  async function daemonStatus() {
    return createJsonGet(agentdJson, AGENTD_CHANNELS.daemonStatus, daemonStatusFallback)
  }

  async function daemonTasks(args) {
    const suffix = buildQueryString({
      status: args?.status,
      deadLetter: args?.deadLetter,
    })

    return createJsonGet(agentdJson, `${AGENTD_CHANNELS.daemonTasks}${suffix}`, daemonTasksFallback)
  }

  async function daemonTaskAdd(args) {
    return createJsonPost(
      agentdJson,
      AGENTD_CHANNELS.daemonTasks,
      {
        type: args?.type,
        payload: args?.payload ?? {},
        maxAttempts: args?.maxAttempts,
      },
      errorOnly,
    )
  }

  async function daemonStart() {
    return createJsonPost(agentdJson, AGENTD_CHANNELS.daemonStart, {}, errorOnly)
  }

  async function daemonStop() {
    return createJsonPost(agentdJson, AGENTD_CHANNELS.daemonStop, {}, errorOnly)
  }

  return {
    daemonStatus,
    daemonTasks,
    daemonTaskAdd,
    daemonStart,
    daemonStop,
  }
}

export function createPlanIpcHandlers(deps) {
  const {
    agentdJson,
    isE2E,
    makePlan,
    terminalWriteSafetyFields,
    e2ePlanPayloads,
  } = deps

  async function fetchRemotePlanForIpc(payload) {
    if (isE2E) {
      return buildE2EPlan(makePlan, payload, terminalWriteSafetyFields)
    }

    const resp = await agentdJson(AGENTD_CHANNELS.plan, {
      method: 'POST',
      body: payload,
      includeLicenseToken: false,
    })

    return resp.plan
  }

  async function executeRemotePlanForIpc(payload) {
    if (isE2E) {
      return buildE2EPlanExecutionResult(e2ePlanPayloads, payload)
    }

    return agentdJson(AGENTD_CHANNELS.executePlan, {
      method: 'POST',
      body: payload,
      includeLicenseToken: true,
    })
  }

  return {
    fetchRemotePlanForIpc,
    executeRemotePlanForIpc,
  }
}

export function createOrchestratorIpcHandlers(deps) {
  const { agentdJson, getCurrentRole, hasRoleAtLeast } = deps

  async function orchestratorIssueToPrForIpc(args) {
    return createJsonPost(agentdJson, AGENTD_CHANNELS.orchestratorIssueToPr, args, errorOnly)
  }

  async function orchestratorGraphForIpc() {
    return createJsonGet(agentdJson, AGENTD_CHANNELS.orchestratorWorkspaceGraph, graphFallback)
  }

  async function orchestratorPrepareBranchForIpc(args) {
    return createJsonPost(agentdJson, AGENTD_CHANNELS.orchestratorPrepareBranch, args, errorOnly)
  }

  async function orchestratorCreatePrForIpc(args) {
    return createJsonPost(agentdJson, AGENTD_CHANNELS.orchestratorCreatePr, args, errorOnly)
  }

  async function orchestratorPrStatusForIpc(args) {
    return createJsonPost(agentdJson, AGENTD_CHANNELS.orchestratorPrStatus, args, errorOnly)
  }

  async function orchestratorWebhookAuditForIpc(args) {
    try {
      const role = getCurrentRole()
      if (!hasRoleAtLeast(role, 'operator')) {
        return webhookAuditDenied()
      }

      const suffix = buildQueryString({
        limit: args?.limit,
        outcome: args?.outcome,
        mapped: args?.mapped,
      })

      return await agentdJson(`${AGENTD_CHANNELS.orchestratorWebhookAudit}${suffix}`, {
        method: 'GET',
        includeLicenseToken: false,
      })
    } catch (error) {
      return webhookAuditFallback(error instanceof Error ? error.message : String(error))
    }
  }

  async function orchestratorCiStatusForIpc(args) {
    return createJsonPost(agentdJson, AGENTD_CHANNELS.orchestratorCiStatus, args, errorOnly)
  }

  async function orchestratorReviewCommentForIpc(args) {
    return createJsonPost(agentdJson, AGENTD_CHANNELS.orchestratorReviewComment, args, errorOnly)
  }

  return {
    orchestratorIssueToPrForIpc,
    orchestratorGraphForIpc,
    orchestratorPrepareBranchForIpc,
    orchestratorCreatePrForIpc,
    orchestratorPrStatusForIpc,
    orchestratorWebhookAuditForIpc,
    orchestratorCiStatusForIpc,
    orchestratorReviewCommentForIpc,
  }
}

export function createAccountIpcHandlers(deps) {
  const { agentdJson } = deps

  async function accountPlanForIpc() {
    return createJsonGet(agentdJson, AGENTD_CHANNELS.accountPlan, accountPlanFallback)
  }

  return {
    accountPlanForIpc,
  }
}

export function createTeamIpcHandlers(deps) {
  const { agentdJson } = deps

  async function teamWorkspaceCreateForIpc(args) {
    return createJsonPost(agentdJson, AGENTD_CHANNELS.workspaces, args, errorOnly, {
      headers: {
        'Idempotency-Key': createIdempotencyKey('team-workspace'),
      },
    })
  }

  async function teamWorkspaceGetForIpc(workspaceId) {
    return createJsonGet(agentdJson, `${AGENTD_CHANNELS.workspaces}/${encodePathParam(workspaceId)}`, errorOnly)
  }

  async function teamInvitesListForIpc(workspaceId) {
    return createJsonGet(agentdJson, `${AGENTD_CHANNELS.workspaces}/${encodePathParam(workspaceId)}/invites`, invitesFallback)
  }

  async function teamInviteCreateForIpc(args) {
    const workspaceId = encodePathParam(args?.workspaceId)

    return createJsonPost(
      agentdJson,
      `${AGENTD_CHANNELS.workspaces}/${workspaceId}/invites`,
      {
        email: args?.email,
        role: args?.role,
        expires_in_hours: args?.expiresInHours,
        send_email: args?.sendEmail,
      },
      errorOnly,
      {
        headers: {
          'Idempotency-Key': createIdempotencyKey('team-invite'),
        },
      },
    )
  }

  async function teamInviteRevokeForIpc(inviteId) {
    return createJsonPost(agentdJson, `${AGENTD_CHANNELS.invites}/${encodePathParam(inviteId)}/revoke`, {}, errorOnly)
  }

  async function teamAuditListForIpc(args) {
    const suffix = buildQueryString({
      type: args?.type,
      from: args?.from,
      to: args?.to,
      limit: args?.limit,
    })

    return createJsonGet(
      agentdJson,
      `${AGENTD_CHANNELS.workspaces}/${encodePathParam(args?.workspaceId)}/audit${suffix}`,
      auditEntriesFallback,
    )
  }

  async function teamBillingEnforcementForIpc(args) {
    return createJsonPut(
      agentdJson,
      `${AGENTD_CHANNELS.workspaces}/${encodePathParam(args?.workspaceId)}/billing/enforce`,
      {
        require_active_plan: args?.requireActivePlan === true,
      },
      errorOnly,
    )
  }

  return {
    teamWorkspaceCreateForIpc,
    teamWorkspaceGetForIpc,
    teamInvitesListForIpc,
    teamInviteCreateForIpc,
    teamInviteRevokeForIpc,
    teamAuditListForIpc,
    teamBillingEnforcementForIpc,
  }
}
