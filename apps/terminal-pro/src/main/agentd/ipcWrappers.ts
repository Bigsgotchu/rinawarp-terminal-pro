// @ts-nocheck

import {
  createAccountIpcHandlers,
  createDaemonIpcHandlers,
  createOrchestratorIpcHandlers,
  createPlanIpcHandlers,
  createTeamIpcHandlers,
} from './agentdIpcHandlers.js'

export function createAgentdIpcWrappers(deps) {
  return {
    ...createDaemonIpcHandlers(deps),
    ...createPlanIpcHandlers(deps),
    ...createOrchestratorIpcHandlers(deps),
    ...createAccountIpcHandlers(deps),
    ...createTeamIpcHandlers(deps),
  }
}
