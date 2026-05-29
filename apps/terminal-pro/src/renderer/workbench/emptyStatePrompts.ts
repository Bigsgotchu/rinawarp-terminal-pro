import type { StarterPromptViewModel } from './view-models/suggestedActionsViewModel.js'

/** Launch empty state: three chips only, no tier/meta clutter. */
export const EMPTY_STATE_PROMPTS: StarterPromptViewModel[] = [
  {
    intent: 'fix',
    label: 'Fix my project',
    prompt: 'Figure out what is broken and fix the safest parts first.',
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
