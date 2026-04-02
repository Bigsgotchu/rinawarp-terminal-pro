import type {
  AgentdIpcWrapperDeps,
  AgentdIpcWrappers,
} from '../startup/runtimeTypes.js'

import {
  createAccountIpcHandlers,
  createDaemonIpcHandlers,
  createOrchestratorIpcHandlers,
  createPlanIpcHandlers,
  createTeamIpcHandlers,
} from './agentdIpcHandlers.js'

export function createAgentdIpcWrappers(
  deps: AgentdIpcWrapperDeps,
): AgentdIpcWrappers {
  return {
    ...createDaemonIpcHandlers(deps),
    ...createPlanIpcHandlers(deps),
    ...createOrchestratorIpcHandlers(deps),
    ...createAccountIpcHandlers(deps),
    ...createTeamIpcHandlers(deps),
  }
}
