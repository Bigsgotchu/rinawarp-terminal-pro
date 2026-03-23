export type GeneralDensityOption = 'compact' | 'comfortable'

export type GeneralPanelModel = {
  workspaceLabel: string
  shortcutLabel: string
  safetyLabel: string
  densityOptions: Array<{
    value: GeneralDensityOption
    label: string
    description: string
  }>
}

export function buildGeneralPanelModel(workspaceLabel: string): GeneralPanelModel {
  return {
    workspaceLabel: workspaceLabel || 'No workspace selected',
    shortcutLabel: 'Open Settings: Ctrl/\u2318 + ,',
    safetyLabel: 'High-impact commands require explicit confirmation.',
    densityOptions: [
      {
        value: 'compact',
        label: 'Compact',
        description: 'Tighter layout for faster scanning.',
      },
      {
        value: 'comfortable',
        label: 'Comfortable',
        description: 'More breathing room across the app.',
      },
    ],
  }
}
