import type { StarterPromptViewModel } from './view-models/suggestedActionsViewModel.js'

/** Launch empty state: verification-first chips only, no tier/meta clutter. */
export const EMPTY_STATE_PROMPTS: StarterPromptViewModel[] = [
  {
    intent: 'fix',
    label: 'Plan a fix',
    prompt: 'Diagnose the project and propose a safe fix plan. Do not edit files without approval.',
    hint: '',
    tone: 'available',
  },
  {
    intent: 'test',
    label: 'Run tests',
    prompt: 'Run the tests and summarize the failures.',
    hint: '',
    tone: 'available',
  },
  {
    intent: 'build',
    label: "What's wrong with my system?",
    prompt: "What's wrong with my system?",
    hint: '',
    tone: 'available',
  },
]
