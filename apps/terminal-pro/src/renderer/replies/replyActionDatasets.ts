import type { ReplyAction } from '../workbench/store.js'

export function buildReplyActionDataset(action: ReplyAction): Record<string, string | undefined> {
  return {
    tab: action.tab,
    agentPrompt: action.prompt,
    executePlan: action.executePlan,
    executePlanPrompt: action.executePlanPrompt,
    executePlanWorkspaceRoot: action.executePlanWorkspaceRoot,
    agentTopTab: action.agentTopTab,
    capabilityInstall: action.capabilityInstall,
    capabilityRun: action.capabilityRun,
    capabilityActionId: action.capabilityActionId,
    planUpgrade: action.planUpgrade,
    runResume: action.runResume,
    runRerun: action.runRerun,
    runFix: action.runFix,
    runDiff: action.runDiff,
    runCopy: action.runCopy,
    openRunsPanel: action.openRunsPanel,
    runReveal: action.runReveal,
    runArtifacts: action.runArtifacts,
  }
}
