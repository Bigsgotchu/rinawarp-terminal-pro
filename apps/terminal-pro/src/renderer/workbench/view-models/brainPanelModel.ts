import type { WorkbenchState } from '../store.js'

export function buildBrainPanelViewModel(state: WorkbenchState) {
  const stats = state.brain.stats
  return {
    stats: stats
      ? [
          { className: 'text-teal', value: String(stats.total), label: 'Total' },
          { className: 'text-hot-pink', value: String(stats.intent), label: 'Intent' },
          { className: 'text-coral', value: String(stats.planning), label: 'Planning' },
          { className: 'text-babyblue', value: String(stats.tool), label: 'Tools' },
          { className: 'text-purple', value: String(stats.memory), label: 'Memory' },
          { className: 'text-green', value: String(stats.result), label: 'Results' },
        ]
      : [],
    events: state.brain.events,
  }
}
