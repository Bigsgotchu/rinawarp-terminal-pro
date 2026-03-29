import type { WorkbenchStore } from '../workbench/store.js'
import { recordDebugEvent } from '../services/debugEvidence.js'

export type UserTurnSource =
  | 'button'
  | 'keyboard'
  | 'starter_chip'
  | 'run_rerun'
  | 'run_resume'
  | 'run_fix'
  | 'run_diff'
  | 'inline_prompt'

type SubmitUserTurnDeps = {
  sendPromptToRina: (store: WorkbenchStore, prompt: string) => Promise<void>
  trackRendererEvent: (event: string, properties?: Record<string, unknown>) => Promise<void>
}

let globalLastSubmitKey = ''
let globalLastSubmitAt = 0
let globalSubmitInFlight = false
const FIRST_PROMPT_SENT_STORAGE_KEY = 'rinawarp.analytics.firstPromptSent.v1'

function hasTrackedFirstPromptSent(): boolean {
  try {
    return localStorage.getItem(FIRST_PROMPT_SENT_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markFirstPromptSentTracked(): void {
  try {
    localStorage.setItem(FIRST_PROMPT_SENT_STORAGE_KEY, '1')
  } catch {
    // Ignore persistence failures.
  }
}

export function resetUserTurnSubmitGuard(): void {
  globalLastSubmitKey = ''
  globalLastSubmitAt = 0
}

export function createUserTurnSubmitter(store: WorkbenchStore, deps: SubmitUserTurnDeps) {
  const shouldBlockDuplicateSubmit = (prompt: string): boolean => {
    const normalized = prompt.trim()
    if (!normalized) return true
    if (globalSubmitInFlight) return true
    const now = Date.now()
    if (normalized === globalLastSubmitKey && now - globalLastSubmitAt < 1000) {
      return true
    }
    globalLastSubmitKey = normalized
    globalLastSubmitAt = now
    return false
  }

  return async (prompt: string, source: UserTurnSource): Promise<boolean> => {
    const trimmed = prompt.trim()
    if (!trimmed) return false

    const settingsOpen = Boolean(window.__rinaSettings?.isOpen?.())
    if (settingsOpen) {
      recordDebugEvent('ui', 'composer.submit_blocked_settings_open', {
        source,
        promptLength: trimmed.length,
        workspaceKey: store.getState().workspaceKey,
        centerDrawer: store.getState().ui.openDrawer,
        rightPanel: store.getState().activeRightView,
      })
      return false
    }

    if (shouldBlockDuplicateSubmit(trimmed)) {
      recordDebugEvent('ui', 'composer.submit_blocked_duplicate', {
        source,
        promptLength: trimmed.length,
        workspaceKey: store.getState().workspaceKey,
        settingsOpen,
        centerDrawer: store.getState().ui.openDrawer,
        rightPanel: store.getState().activeRightView,
      })
      return false
    }

    recordDebugEvent('ui', 'composer.submit', {
      source,
      promptLength: trimmed.length,
      workspaceKey: store.getState().workspaceKey,
      activeTab: store.getState().activeTab,
      settingsOpen,
      centerDrawer: store.getState().ui.openDrawer,
      rightPanel: store.getState().activeRightView,
    })

    globalSubmitInFlight = true
    try {
      await deps.sendPromptToRina(store, trimmed)
      if (!hasTrackedFirstPromptSent()) {
        markFirstPromptSentTracked()
        void deps.trackRendererEvent('first_prompt_sent', {
          source,
          prompt_length: trimmed.length,
          workspace_selected: store.getState().workspaceKey !== '__none__',
        })
      }
      return true
    } finally {
      globalSubmitInFlight = false
    }
  }
}
