import type { RepairPlan, RepairStep } from '../rina/repair-planner'

function disabledMarkup(title: string): string {
  console.warn('[ui] legacy repair UI helpers are disabled; use workbench/render.ts')
  return `${title}\n\nLegacy repair UI disabled. Use the canonical workbench renderer.`
}

export function renderRepairPlan(_plan: RepairPlan): string {
  return disabledMarkup('Repair plan unavailable')
}

export function renderCLIBlock(_step: RepairStep): string {
  return disabledMarkup('Repair step unavailable')
}

export function renderApprovalPrompt(_step: RepairStep): string {
  return disabledMarkup('Approval prompt unavailable')
}

export function renderStepResult(_step: RepairStep, _success: boolean, _output: string): string {
  return disabledMarkup('Repair result unavailable')
}

export function renderRepairSummary(_results: Array<{ step: RepairStep; success: boolean }>): string {
  return disabledMarkup('Repair summary unavailable')
}

export function parseRepairAction(_message: string): {
  action: 'run' | 'run-step' | 'skip' | 'copy' | 'help' | 'unknown'
  stepId?: string
} {
  return { action: 'unknown' }
}
