// @ts-nocheck

export const AGENTD_CHANNELS = {
  daemonStatus: '/v1/daemon/status',
  daemonTasks: '/v1/daemon/tasks',
  daemonStart: '/v1/daemon/start',
  daemonStop: '/v1/daemon/stop',
  plan: '/v1/plan',
  executePlan: '/v1/execute-plan',
  orchestratorIssueToPr: '/v1/orchestrator/issue-to-pr',
  orchestratorWorkspaceGraph: '/v1/orchestrator/workspace-graph',
  orchestratorPrepareBranch: '/v1/orchestrator/git/prepare-branch',
  orchestratorCreatePr: '/v1/orchestrator/github/create-pr',
  orchestratorPrStatus: '/v1/orchestrator/github/pr-status',
  orchestratorWebhookAudit: '/v1/orchestrator/github/webhook-audit',
  orchestratorCiStatus: '/v1/orchestrator/ci/status',
  orchestratorReviewComment: '/v1/orchestrator/review/comment',
  accountPlan: '/v1/account/plan',
  workspaces: '/v1/workspaces',
  invites: '/v1/invites',
}
