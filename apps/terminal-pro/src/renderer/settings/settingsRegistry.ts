import { mountAboutPanel } from './panels/about.js'
import { mountAccountPanel } from './panels/account.js'
import { mountDiagnosticsPanel } from './panels/diagnostics.js'
import { mountGeneralPanel } from './panels/general.js'
import { mountLicensePanel } from './panels/license.js'
import { mountMemoryPanel } from './panels/memory.js'
import { mountResearchPanel } from './panels/research.js'
import { mountRetrievalPanel } from './panels/retrieval.js'
import { mountTeamPanel } from './panels/team.js'
import { mountThemesPanel } from './panels/themes.js'
import { mountUpdatesPanel } from './panels/updates.js'
import type { SettingsTab } from './tabs.js'

export const SETTINGS_TABS: SettingsTab[] = [
  { id: 'account', label: 'Account', icon: '👤', mount: (el: HTMLElement) => void mountAccountPanel(el) },
  { id: 'team', label: 'Team', icon: '👥', mount: (el: HTMLElement) => void mountTeamPanel(el) },
  { id: 'general', label: 'General', icon: '⚡', mount: (el: HTMLElement) => mountGeneralPanel(el) },
  { id: 'memory', label: 'Memory', icon: '🧠', mount: (el: HTMLElement) => void mountMemoryPanel(el) },
  { id: 'themes', label: 'Themes', icon: '🎨', mount: (el: HTMLElement) => void mountThemesPanel(el) },
  { id: 'retrieval', label: 'Retrieval', icon: '🔍', mount: (el: HTMLElement) => void mountRetrievalPanel(el) },
  { id: 'research', label: 'Research', icon: '🌐', mount: (el: HTMLElement) => void mountResearchPanel(el) },
  { id: 'updates', label: 'Updates', icon: '🔄', mount: (el: HTMLElement) => void mountUpdatesPanel(el) },
  { id: 'license', label: 'License', icon: '🔑', mount: (el: HTMLElement) => void mountLicensePanel(el) },
  { id: 'diagnostics', label: 'Diagnostics', icon: '🧪', mount: (el: HTMLElement) => void mountDiagnosticsPanel(el) },
  { id: 'about', label: 'About', icon: 'ℹ️', mount: (el: HTMLElement) => void mountAboutPanel(el) },
]
