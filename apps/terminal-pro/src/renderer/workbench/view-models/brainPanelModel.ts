import type { WorkbenchState } from '../store.js'

export function buildBrainPanelViewModel(state: WorkbenchState) {
  const stats = state.brain.stats
  return {
    stats: stats
      ? [
          { className: 'text-teal', value: String(stats.total ?? 0), label: 'Total' },
          { className: 'text-hot-pink', value: String(stats.intent ?? 0), label: 'Intent' },
          { className: 'text-coral', value: String(stats.planning ?? 0), label: 'Planning' },
          { className: 'text-babyblue', value: String(stats.tool ?? 0), label: 'Tools' },
          { className: 'text-purple', value: String(stats.memory ?? 0), label: 'Memory' },
          { className: 'text-green', value: String(stats.result ?? 0), label: 'Results' },
        ]
      : [],
    events: state.brain.events || [],
  }
}
