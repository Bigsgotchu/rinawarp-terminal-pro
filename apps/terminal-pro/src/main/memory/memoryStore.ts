import path from 'node:path'
import type { OwnerMemoryStoreDeps } from '../startup/runtimeTypes.js'

type TonePreference = 'concise' | 'balanced' | 'detailed'
type HumorPreference = 'low' | 'medium' | 'high'

type RinaMemoryProfile = {
  preferredName?: string
  tonePreference?: TonePreference
  humorPreference?: HumorPreference
  likes?: string[]
  dislikes?: string[]
}

type WorkspaceMemory = {
  workspaceId: string
  label?: string
  preferredResponseStyle?: string[]
  preferredProofStyle?: string[]
  conventions?: Array<{
    key: string
    value: string
  }>
  updatedAt: string
}

type InferredMemoryKind = 'preference' | 'habit' | 'project' | 'relationship'

type InferredMemoryEntry = {
  id: string
  kind: InferredMemoryKind
  summary: string
  confidence: number
  source: 'behavior' | 'conversation'
  workspaceId?: string
  runId?: string
  status: 'suggested' | 'approved' | 'dismissed'
  createdAt: string
  updatedAt: string
}

type RecentRunSignal = {
  sessionId: string
  projectRoot?: string
  latestCommand?: string
  latestReceiptId?: string
  failedCount?: number
  interrupted?: boolean
}

type OwnerMemoryRecord = {
  ownerId: string
  profile: RinaMemoryProfile
  workspaces: Record<string, WorkspaceMemory>
  inferredMemories: InferredMemoryEntry[]
  updatedAt: string
}

type MemoryFile = {
  version: 1
  owners: Record<string, OwnerMemoryRecord>
}

type OwnerIdentity = {
  ownerId: string
  mode: 'licensed' | 'local-fallback'
  customerId: string | null
  email: string | null
}

export function createOwnerMemoryStore(deps: OwnerMemoryStoreDeps) {
  const pathApi = deps.path || path

  const filePath = () => pathApi.join(deps.app.getPath('userData'), 'rina-memory-v1.json')

  function emptyFile(): MemoryFile {
    return { version: 1, owners: {} }
  }

  function readFile(): MemoryFile {
    const parsed = deps.readJsonIfExists(filePath()) as MemoryFile | null
    if (!parsed || parsed.version !== 1 || typeof parsed.owners !== 'object' || parsed.owners === null) {
      return emptyFile()
    }
    return parsed
  }

  function writeFile(next: MemoryFile): void {
    deps.writeJsonFile(filePath(), next)
  }

  function normalizeStringList(values: unknown): string[] {
    if (!Array.isArray(values)) return []
    return values
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .slice(0, 24)
  }

  function normalizeConventions(values: unknown): Array<{ key: string; value: string }> {
    if (!Array.isArray(values)) return []
    return values
      .map((entry) => {
        const record = (entry || {}) as Record<string, unknown>
        const key = String(record.key || '').trim()
        const value = String(record.value || '').trim()
        if (!key || !value) return null
        return { key, value }
      })
      .filter(Boolean) as Array<{ key: string; value: string }>
  }

  function defaultProfile(): RinaMemoryProfile {
    return {
      preferredName: '',
      tonePreference: 'balanced',
      humorPreference: 'medium',
      likes: [],
      dislikes: [],
    }
  }

  function resolveOwnerIdentity(): OwnerIdentity {
    const customerId = deps.getCurrentLicenseCustomerId()
    const email = deps.getCachedEmail()
    if (customerId) {
      return {
        ownerId: `license:${customerId}`,
        mode: 'licensed',
        customerId,
        email,
      }
    }
    return {
      ownerId: `local:${deps.getDeviceId()}`,
      mode: 'local-fallback',
      customerId: null,
      email,
    }
  }

  function ensureOwner(file: MemoryFile, ownerId: string): OwnerMemoryRecord {
    const existing = file.owners[ownerId]
    if (existing) return existing
    const created: OwnerMemoryRecord = {
      ownerId,
      profile: defaultProfile(),
      workspaces: {},
      inferredMemories: [],
      updatedAt: new Date().toISOString(),
    }
    file.owners[ownerId] = created
    return created
  }

  function normalizeInferredMemories(values: unknown): InferredMemoryEntry[] {
    if (!Array.isArray(values)) return []
    return values
      .map((entry) => {
        const record = (entry || {}) as Record<string, unknown>
        const id = String(record.id || '').trim()
        const summary = String(record.summary || '').trim()
        const kind = record.kind
        const source = record.source
        const status = record.status
        if (!id || !summary) return null
        if (kind !== 'preference' && kind !== 'habit' && kind !== 'project' && kind !== 'relationship') return null
        if (source !== 'behavior' && source !== 'conversation') return null
        if (status !== 'suggested' && status !== 'approved' && status !== 'dismissed') return null
        const confidenceValue = Number(record.confidence)
        return {
          id,
          kind,
          summary,
          confidence: Number.isFinite(confidenceValue) ? Math.max(0, Math.min(1, confidenceValue)) : 0.5,
          source,
          workspaceId: String(record.workspaceId || '').trim() || undefined,
          runId: String(record.runId || '').trim() || undefined,
          status,
          createdAt: String(record.createdAt || new Date().toISOString()),
          updatedAt: String(record.updatedAt || new Date().toISOString()),
        } satisfies InferredMemoryEntry
      })
      .filter(Boolean) as InferredMemoryEntry[]
  }

  function classifyRunIntent(command: string): 'build' | 'test' | 'deploy' | 'fix' | 'command' {
    const normalized = String(command || '').toLowerCase()
    if (normalized.includes('build')) return 'build'
    if (normalized.includes('test')) return 'test'
    if (normalized.includes('deploy')) return 'deploy'
    if (/\bfix|repair\b/.test(normalized)) return 'fix'
    return 'command'
  }

  function buildSuggestedInferences(record: OwnerMemoryRecord): InferredMemoryEntry[] {
    const existing = new Map(normalizeInferredMemories(record.inferredMemories).map((entry) => [entry.id, entry]))
    const recentRuns = Array.isArray(deps.listRecentRuns?.(40)) ? deps.listRecentRuns!(40) : []
    if (recentRuns.length === 0) return Array.from(existing.values())

    const grouped = new Map<string, { workspaceId: string; build: number; test: number; deploy: number; fix: number; latestRunId?: string }>()
    for (const run of recentRuns) {
      const workspaceId = String(run.projectRoot || '').trim()
      if (!workspaceId) continue
      const group = grouped.get(workspaceId) || {
        workspaceId,
        build: 0,
        test: 0,
        deploy: 0,
        fix: 0,
        latestRunId: undefined,
      }
      const kind = classifyRunIntent(String(run.latestCommand || ''))
      if (kind === 'build') group.build += 1
      if (kind === 'test') group.test += 1
      if (kind === 'deploy') group.deploy += 1
      if (kind === 'fix') group.fix += 1
      group.latestRunId = group.latestRunId || String(run.latestReceiptId || run.sessionId || '').trim() || undefined
      grouped.set(workspaceId, group)
    }

    const now = new Date().toISOString()
    for (const group of grouped.values()) {
      const workspaceLabel = pathApi.basename(group.workspaceId)
      const suggestions: Array<Omit<InferredMemoryEntry, 'status' | 'createdAt' | 'updatedAt'>> = []
      if (group.build >= 2) {
        suggestions.push({
          id: `habit:${group.workspaceId}:build-first`,
          kind: 'habit',
          summary: `${workspaceLabel} usually starts with a build check before broader verification.`,
          confidence: 0.72,
          source: 'behavior',
          workspaceId: group.workspaceId,
          runId: group.latestRunId,
        })
      }
      if (group.test >= 2) {
        suggestions.push({
          id: `habit:${group.workspaceId}:test-gate`,
          kind: 'habit',
          summary: `${workspaceLabel} tends to use tests as the main proof gate after changes.`,
          confidence: 0.78,
          source: 'behavior',
          workspaceId: group.workspaceId,
          runId: group.latestRunId,
        })
      }
      if (group.deploy >= 1) {
        suggestions.push({
          id: `project:${group.workspaceId}:deploy-aware`,
          kind: 'project',
          summary: `${workspaceLabel} includes a real deploy path, so release-target proof is worth surfacing early.`,
          confidence: 0.66,
          source: 'behavior',
          workspaceId: group.workspaceId,
          runId: group.latestRunId,
        })
      }
      if (group.fix >= 2) {
        suggestions.push({
          id: `habit:${group.workspaceId}:repair-loop`,
          kind: 'habit',
          summary: `${workspaceLabel} often moves through repair loops, so concise recovery guidance should stay prominent.`,
          confidence: 0.7,
          source: 'behavior',
          workspaceId: group.workspaceId,
          runId: group.latestRunId,
        })
      }

      for (const suggestion of suggestions) {
        if (existing.has(suggestion.id)) continue
        existing.set(suggestion.id, {
          ...suggestion,
          status: 'suggested',
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    return Array.from(existing.values()).sort((a, b) => {
      if (a.status === b.status) return a.summary.localeCompare(b.summary)
      if (a.status === 'approved') return -1
      if (b.status === 'approved') return 1
      if (a.status === 'suggested') return -1
      if (b.status === 'suggested') return 1
      return 0
    })
  }

  function getState(): {
    owner: OwnerIdentity
    memory: OwnerMemoryRecord
  } {
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const memory = ensureOwner(file, owner.ownerId)
    if (!file.owners[owner.ownerId]) {
      writeFile(file)
    }
    return {
      owner,
      memory: {
        ...memory,
        profile: {
          ...defaultProfile(),
          ...memory.profile,
        },
        workspaces: memory.workspaces || {},
        inferredMemories: buildSuggestedInferences(memory),
      },
    }
  }

  function updateProfile(input: Partial<RinaMemoryProfile>): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    record.profile = {
      preferredName: String(input.preferredName || '').trim(),
      tonePreference:
        input.tonePreference === 'concise' || input.tonePreference === 'balanced' || input.tonePreference === 'detailed'
          ? input.tonePreference
          : record.profile.tonePreference || 'balanced',
      humorPreference:
        input.humorPreference === 'low' || input.humorPreference === 'medium' || input.humorPreference === 'high'
          ? input.humorPreference
          : record.profile.humorPreference || 'medium',
      likes: normalizeStringList(input.likes),
      dislikes: normalizeStringList(input.dislikes),
    }
    record.updatedAt = new Date().toISOString()
    writeFile(file)
    return getState()
  }

  function updateWorkspace(
    workspaceId: string,
    input: {
      label?: string
      preferredResponseStyle?: string[]
      preferredProofStyle?: string[]
      conventions?: Array<{ key: string; value: string }>
    }
  ): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const normalizedWorkspaceId = String(workspaceId || '').trim()
    if (!normalizedWorkspaceId) {
      throw new Error('workspaceId is required')
    }
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    record.workspaces[normalizedWorkspaceId] = {
      workspaceId: normalizedWorkspaceId,
      label: String(input.label || '').trim() || pathApi.basename(normalizedWorkspaceId),
      preferredResponseStyle: normalizeStringList(input.preferredResponseStyle),
      preferredProofStyle: normalizeStringList(input.preferredProofStyle),
      conventions: normalizeConventions(input.conventions),
      updatedAt: new Date().toISOString(),
    }
    record.updatedAt = new Date().toISOString()
    writeFile(file)
    return getState()
  }

  function resetWorkspace(workspaceId: string): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const normalizedWorkspaceId = String(workspaceId || '').trim()
    if (!normalizedWorkspaceId) {
      throw new Error('workspaceId is required')
    }
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    delete record.workspaces[normalizedWorkspaceId]
    record.updatedAt = new Date().toISOString()
    writeFile(file)
    return getState()
  }

  function resetAll(): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const owner = resolveOwnerIdentity()
    const file = readFile()
    file.owners[owner.ownerId] = {
      ownerId: owner.ownerId,
      profile: defaultProfile(),
      workspaces: {},
      inferredMemories: [],
      updatedAt: new Date().toISOString(),
    }
    writeFile(file)
    return getState()
  }

  function deleteEntry(args: {
    scope: 'profile' | 'workspace'
    field: 'likes' | 'dislikes' | 'preferredResponseStyle' | 'preferredProofStyle' | 'conventions' | 'inferredMemories'
    workspaceId?: string
    value?: string
    key?: string
  }): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    if (args.scope === 'profile') {
      if (args.field === 'likes' || args.field === 'dislikes') {
        const next = normalizeStringList(record.profile[args.field]).filter((entry) => entry !== String(args.value || '').trim())
        record.profile[args.field] = next
      }
      if (args.field === 'inferredMemories') {
        record.inferredMemories = normalizeInferredMemories(record.inferredMemories).filter(
          (entry) => entry.id !== String(args.value || args.key || '').trim()
        )
      }
    } else {
      const workspaceId = String(args.workspaceId || '').trim()
      if (!workspaceId || !record.workspaces[workspaceId]) {
        throw new Error('workspaceId is required')
      }
      const workspace = record.workspaces[workspaceId]
      if (args.field === 'preferredResponseStyle' || args.field === 'preferredProofStyle') {
        workspace[args.field] = normalizeStringList(workspace[args.field]).filter((entry) => entry !== String(args.value || '').trim())
      }
      if (args.field === 'conventions') {
        workspace.conventions = normalizeConventions(workspace.conventions).filter((entry) => entry.key !== String(args.key || '').trim())
      }
      workspace.updatedAt = new Date().toISOString()
    }
    record.updatedAt = new Date().toISOString()
    writeFile(file)
    return getState()
  }

  function setInferredMemoryStatus(
    id: string,
    status: 'approved' | 'dismissed'
  ): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const normalizedId = String(id || '').trim()
    if (!normalizedId) throw new Error('id is required')
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    const current = buildSuggestedInferences(record)
    const target = current.find((entry) => entry.id === normalizedId)
    if (!target) throw new Error('inferred memory not found')
    const persisted = normalizeInferredMemories(record.inferredMemories).filter((entry) => entry.id !== normalizedId)
    const now = new Date().toISOString()
    persisted.push({
      ...target,
      status,
      updatedAt: now,
      createdAt: target.createdAt || now,
    })
    record.inferredMemories = persisted
    record.updatedAt = now
    writeFile(file)
    return getState()
  }

  return {
    resolveOwnerIdentity,
    getState,
    updateProfile,
    updateWorkspace,
    resetWorkspace,
    resetAll,
    deleteEntry,
    setInferredMemoryStatus,
  }
}
