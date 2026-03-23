import type { SettingsTab } from './tabs.js'

export type SettingsShellRailItemModel = {
  id: string
  label: string
  icon: string
}

export type SettingsShellModel = {
  title: string
  closeLabel: string
  railItems: SettingsShellRailItemModel[]
}

export function createSettingsShellModel(tabs: SettingsTab[]): SettingsShellModel {
  return {
    title: 'Settings',
    closeLabel: 'Close',
    railItems: tabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      icon: tab.icon || '•',
    })),
  }
}
