import type { AgentEmptyCardViewModel } from './agentThreadModel.js'
import type { WorkbenchState } from '../store.js'
import { getWorkspaceContextState } from '../renderers/selectors.js'

export type StarterIntentKey = 'build' | 'test' | 'inspect' | 'receipts' | 'fix'

export type StarterPromptViewModel = {
  intent: StarterIntentKey
  label: string
  prompt: string
  hint: string
  tone: 'available' | 'enhanced'
}

function actionClass(role: 'primary' | 'secondary' | 'attention' | 'quiet'): string {
  if (role === 'primary') return 'rw-inline-action is-primary'
  if (role === 'secondary') return 'rw-inline-action is-secondary'
  if (role === 'attention') return 'rw-inline-action is-attention'
  return 'rw-inline-action is-subtle'
}

export function getStarterPromptViewModels(state: WorkbenchState): StarterPromptViewModel[] {
  const currentTier = String(state.license.tier || 'free').toLowerCase()
  const isStarter = currentTier === 'starter' || currentTier === 'free'
  const meta = (intent: StarterIntentKey): { hint: string; tone: 'available' | 'enhanced' } => {
    if (intent === 'build' || intent === 'test' || intent === 'inspect' || intent === 'receipts' || intent === 'fix') {
      return { hint: isStarter ? 'Available now' : 'Included', tone: 'available' }
    }
    return { hint: isStarter ? 'Pro adds more' : 'Unlocked', tone: 'enhanced' }
  }

  return [
    { intent: 'build', label: 'Build this project', prompt: 'Build this project and tell me what fails.', ...meta('build') },
    { intent: 'test', label: 'Run tests', prompt: 'Run the tests and summarize the failures.', ...meta('test') },
    { intent: 'inspect', label: 'Inspect workspace', prompt: 'Inspect this workspace and summarize the safest next step. Do not change files.', ...meta('inspect') },
    { intent: 'receipts', label: 'Show receipts', prompt: 'Show recent receipts and summarize the latest proof-backed runs.', ...meta('receipts') },
    { intent: 'fix', label: 'Plan a fix', prompt: 'Diagnose the project and propose a safe fix plan. Do not edit files without approval.', ...meta('fix') },
  ]
}

export function buildSuggestedActionsCardModel(state: WorkbenchState): AgentEmptyCardViewModel {
  const workspaceState = getWorkspaceContextState(state)
  return {
    sectionKey: 'suggested-actions',
    label: 'Suggested actions',
    title:
      workspaceState.status === 'project'
        ? 'Start with proof-backed build, test, or inspection.'
        : 'Open a project first, then start with a verification action.',
    copy:
      workspaceState.status === 'project'
        ? 'Mutation stays behind an explicit plan, diff, rollback, and approval path.'
        : workspaceState.reason,
    className: 'rw-agent-empty-actions',
    actions:
      workspaceState.status === 'project'
        ? []
        : [
            { label: 'Open project', className: actionClass('primary'), dataset: { pickWorkspace: 'suggested-actions' } },
            { label: 'Try demo project', className: actionClass('secondary'), dataset: { loadDemoProject: 'suggested-actions' } },
          ],
    prompts: getStarterPromptViewModels(state),
  }
}
