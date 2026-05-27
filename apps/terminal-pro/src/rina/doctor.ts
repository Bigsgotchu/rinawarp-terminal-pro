/**
 * LEGACY CLI doctor — forwards diagnostics to canonical runtime (no direct shell).
 */

import { executionRecordToLegacyText, legacyPlanToRuntime } from '../runtime/bridge/RinaRuntimeBridge.js'

const DEFAULT_ROOT = process.cwd()

async function forwardDoctorPrompt(prompt: string, projectRoot: string = DEFAULT_ROOT): Promise<string> {
  const record = await legacyPlanToRuntime(prompt, projectRoot)
  return executionRecordToLegacyText(record)
}

export async function runDoctor(): Promise<string> {
  return forwardDoctorPrompt(
    [
      'Diagnose this workspace health.',
      'Inspect Node/npm availability, dependencies, git state, and Docker — read-only.',
      'List suggested fixes but do not mutate files.',
    ].join('\n'),
  )
}

export async function runDoctorFix(): Promise<string> {
  return forwardDoctorPrompt(
    [
      'Apply safe workspace fixes through the canonical runtime.',
      'Prefer dependency install and reversible cleanup only.',
      'Report what ran and verification results.',
    ].join('\n'),
  )
}
