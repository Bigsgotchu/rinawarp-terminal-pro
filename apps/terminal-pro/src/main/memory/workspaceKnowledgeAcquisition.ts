import { redactText } from '@rinawarp/safety/redaction'
import type { ProofVerification } from '../../structured-session-types.js'
import { extractWorkspaceFacts, type ProofRecordInput } from './workspaceFactExtractor.js'
import type { WorkspaceFact } from './memoryTypes.js'
import type { WorkspaceFactStore } from './workspaceFactStore.js'

export type ProofWorkspaceFactAcquisitionInput = {
  verification: ProofVerification
  store: WorkspaceFactStore
  successfulCommands?: number
  failedCommands?: number
}

export type ProofWorkspaceFactAcquisitionResult = {
  acquired: boolean
  reason?: 'missing_verified_proof' | 'proof_not_verified' | 'secret_detected' | 'no_proof_facts'
  facts: WorkspaceFact[]
}

function stableProofFactId(key: string): string {
  return `workspace_fact_${key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`
}

function buildProofRecord(input: ProofWorkspaceFactAcquisitionInput): ProofRecordInput {
  return {
    proofId: input.verification.proof_id,
    verificationStatus: input.verification.verification_status,
    evidenceCount: input.verification.evidence_count,
    successfulCommands: input.successfulCommands,
    failedCommands: input.failedCommands,
  }
}

function hasSecretLikeText(value: unknown): boolean {
  return redactText(String(value ?? '')).hits.length > 0
}

function proofInputContainsSecret(input: ProofWorkspaceFactAcquisitionInput): boolean {
  const verification = input.verification
  return (
    hasSecretLikeText(verification.proof_id) ||
    hasSecretLikeText(verification.runtime_id) ||
    hasSecretLikeText(verification.evidence_summary)
  )
}

export async function acquireWorkspaceFactsFromVerifiedProof(
  input: ProofWorkspaceFactAcquisitionInput
): Promise<ProofWorkspaceFactAcquisitionResult> {
  if (!input.verification) {
    return { acquired: false, reason: 'missing_verified_proof', facts: [] }
  }
  if (input.verification.verification_status !== 'verified') {
    return { acquired: false, reason: 'proof_not_verified', facts: [] }
  }
  if (proofInputContainsSecret(input)) {
    return { acquired: false, reason: 'secret_detected', facts: [] }
  }

  const proofFacts = extractWorkspaceFacts({ proofRecords: [buildProofRecord(input)] })
    .filter((fact) => fact.source === 'proof')
    .map((fact) => ({
      ...fact,
      id: stableProofFactId(fact.key),
      last_verified_at: input.verification.verification_ts,
    }))

  if (proofFacts.length === 0) {
    return { acquired: false, reason: 'no_proof_facts', facts: [] }
  }

  const persisted: WorkspaceFact[] = []
  for (const fact of proofFacts) {
    persisted.push(await input.store.upsertFact(fact))
  }

  return { acquired: true, facts: persisted }
}
