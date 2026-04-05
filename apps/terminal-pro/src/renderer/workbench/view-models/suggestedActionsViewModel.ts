import type { AgentEmptyCardViewModel } from './agentThreadModel.js'
import type { WorkbenchState } from '../store.js'
import { getWorkspaceContextState } from '../renderers/selectors.js'

export type StarterIntentKey = 'build' | 'test' | 'deploy' | 'fix'

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
  const isStarter = (state.license.tier || 'starter') === 'starter'
  const meta = (intent: StarterIntentKey): { hint: string; tone: 'available' | 'enhanced' } => {
    if (intent === 'build' || intent === 'test') return { hint: isStarter ? 'Available now' : 'Included', tone: 'available' }
    return { hint: isStarter ? 'Pro adds more' : 'Unlocked', tone: 'enhanced' }
  }

  return [
    { intent: 'build', label: 'Build this project', prompt: 'Build this project and tell me what fails.', ...meta('build') },
    { intent: 'test', label: 'Run tests', prompt: 'Run the tests and summarize the failures.', ...meta('test') },
    { intent: 'deploy', label: 'Deploy', prompt: 'Deploy this project and tell me what you need first.', ...meta('deploy') },
    { intent: 'fix', label: 'Fix what’s broken', prompt: 'Figure out what is broken and fix the safest parts first.', ...meta('fix') },
  ]
}

export function buildSuggestedActionsCardModel(state: WorkbenchState): AgentEmptyCardViewModel {
  const workspaceState = getWorkspaceContextState(state)
  return {
    sectionKey: 'suggested-actions',
    label: 'Suggested actions',
    title:
      workspaceState.status === 'project'
        ? 'Start with Fix Project and get to a successful result fast.'
        : 'Open a project first, then start with a guided fix.',
    copy:
      workspaceState.status === 'project'
        ? 'The fastest path to the aha moment is watching one repair complete end to end with proof.'
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
