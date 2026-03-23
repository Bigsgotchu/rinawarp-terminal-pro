import { linesFromConventions, linesFromStrings, renderMemoryPanelShell, renderWorkspaceSummary } from './memorySurface.js'

type MemoryState = {
  owner: {
    ownerId: string
    mode: 'licensed' | 'local-fallback'
    customerId: string | null
    email: string | null
  }
  memory: {
    ownerId: string
    profile: {
      preferredName?: string
      tonePreference?: 'concise' | 'balanced' | 'detailed'
      humorPreference?: 'low' | 'medium' | 'high'
      likes?: string[]
      dislikes?: string[]
    }
    workspaces: Record<
      string,
      {
        workspaceId: string
        label?: string
        preferredResponseStyle?: string[]
        preferredProofStyle?: string[]
        conventions?: Array<{ key: string; value: string }>
        updatedAt: string
      }
    >
    inferredMemories: Array<{
      id: string
      kind: 'preference' | 'habit' | 'project' | 'relationship'
      summary: string
      confidence: number
      source: 'behavior' | 'conversation'
      workspaceId?: string
      runId?: string
      status: 'suggested' | 'approved' | 'dismissed'
      createdAt: string
      updatedAt: string
    }>
    updatedAt: string
  }
}

type MemoryApi = {
  memoryGetState?: () => Promise<MemoryState>
  memoryUpdateProfile?: (input: MemoryState['memory']['profile']) => Promise<MemoryState>
  memoryUpdateWorkspace?: (
    workspaceId: string,
    input: {
      label?: string
      preferredResponseStyle?: string[]
      preferredProofStyle?: string[]
      conventions?: Array<{ key: string; value: string }>
    }
  ) => Promise<MemoryState>
  memoryDeleteEntry?: (input: {
    scope: 'profile' | 'workspace'
    field: 'likes' | 'dislikes' | 'preferredResponseStyle' | 'preferredProofStyle' | 'conventions' | 'inferredMemories'
    workspaceId?: string
    value?: string
    key?: string
  }) => Promise<MemoryState>
  memorySetInferredStatus?: (id: string, status: 'approved' | 'dismissed') => Promise<MemoryState>
  memoryResetWorkspace?: (workspaceId: string) => Promise<MemoryState>
  memoryResetAll?: () => Promise<MemoryState>
  workspaceDefault?: () => Promise<{ ok?: boolean; path?: string }>
}

function getRina(): MemoryApi | null {
  return ((window as unknown as { rina?: MemoryApi }).rina || null) as MemoryApi | null
}

function splitLines(value: string): string[] {
  return String(value || '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseConventions(value: string): Array<{ key: string; value: string }> {
  return splitLines(value)
    .map((line) => {
      const [key, ...rest] = line.split('=')
      const normalizedKey = String(key || '').trim()
      const normalizedValue = rest.join('=').trim()
      if (!normalizedKey || !normalizedValue) return null
      return { key: normalizedKey, value: normalizedValue }
    })
    .filter(Boolean) as Array<{ key: string; value: string }>
}

export async function mountMemoryPanel(container: HTMLElement): Promise<void> {
  container.innerHTML = renderMemoryPanelShell()

  const rina = getRina()
  if (
    !rina?.memoryGetState ||
    !rina?.memoryUpdateProfile ||
    !rina?.memoryUpdateWorkspace ||
    !rina?.memorySetInferredStatus ||
    !rina?.memoryDeleteEntry ||
    !rina?.memoryResetWorkspace ||
    !rina?.memoryResetAll ||
    !rina?.workspaceDefault
  ) {
    container.querySelector('#rw-memory-feedback')!.textContent = 'Memory API not available. Check the preload bridge.'
    return
  }

  const ownerMeta = container.querySelector<HTMLElement>('#rw-memory-owner-meta')!
  const preferredNameInput = container.querySelector<HTMLInputElement>('#rw-memory-preferred-name')!
  const toneSelect = container.querySelector<HTMLSelectElement>('#rw-memory-tone')!
  const humorSelect = container.querySelector<HTMLSelectElement>('#rw-memory-humor')!
  const likesInput = container.querySelector<HTMLTextAreaElement>('#rw-memory-likes')!
  const dislikesInput = container.querySelector<HTMLTextAreaElement>('#rw-memory-dislikes')!
  const workspacePath = container.querySelector<HTMLElement>('#rw-memory-workspace-path')!
  const workspaceStatus = container.querySelector<HTMLElement>('#rw-memory-workspace-status')!
  const workspaceSummary = container.querySelector<HTMLElement>('#rw-memory-workspace-summary')!
  const inferredList = container.querySelector<HTMLElement>('#rw-memory-inferred-list')!
  const responseStyleInput = container.querySelector<HTMLTextAreaElement>('#rw-memory-response-style')!
  const proofStyleInput = container.querySelector<HTMLTextAreaElement>('#rw-memory-proof-style')!
  const conventionsInput = container.querySelector<HTMLTextAreaElement>('#rw-memory-conventions')!
  const saveProfileButton = container.querySelector<HTMLButtonElement>('#rw-memory-save-profile')!
  const saveWorkspaceButton = container.querySelector<HTMLButtonElement>('#rw-memory-save-workspace')!
  const resetWorkspaceButton = container.querySelector<HTMLButtonElement>('#rw-memory-reset-workspace')!
  const resetAllButton = container.querySelector<HTMLButtonElement>('#rw-memory-reset-all')!
  const feedback = container.querySelector<HTMLElement>('#rw-memory-feedback')!

  let currentState: MemoryState | null = null
  let currentWorkspaceId = ''

  const setFeedback = (message: string) => {
    feedback.textContent = message
  }

  const loadWorkspaceId = async (): Promise<string> => {
    const result = await rina.workspaceDefault?.()
    return result?.ok && result.path ? result.path : ''
  }

  const render = async () => {
    currentWorkspaceId = await loadWorkspaceId()
    currentState = await rina.memoryGetState!()
    const profile = currentState.memory.profile || {}
    const workspaceMemory = currentWorkspaceId ? currentState.memory.workspaces[currentWorkspaceId] : undefined
    ownerMeta.innerHTML = `
      <div>
        <div class="rw-label">Owner identity</div>
        <div class="rw-muted">${currentState.owner.ownerId}</div>
      </div>
      <div class="rw-pill">${currentState.owner.mode === 'licensed' ? 'Licensed owner' : 'Local owner fallback'}</div>
    `
    preferredNameInput.value = profile.preferredName || ''
    toneSelect.value = profile.tonePreference || 'balanced'
    humorSelect.value = profile.humorPreference || 'medium'
    likesInput.value = linesFromStrings(profile.likes)
    dislikesInput.value = linesFromStrings(profile.dislikes)
    workspacePath.textContent = currentWorkspaceId || 'No workspace resolved'
    workspaceStatus.textContent = currentWorkspaceId ? 'Workspace scoped' : 'No workspace'
    workspaceSummary.innerHTML = currentWorkspaceId ? renderWorkspaceSummary(currentWorkspaceId, workspaceMemory) : `<div class="rw-muted">Open a workspace to attach workspace memory.</div>`
    responseStyleInput.value = linesFromStrings(workspaceMemory?.preferredResponseStyle)
    proofStyleInput.value = linesFromStrings(workspaceMemory?.preferredProofStyle)
    conventionsInput.value = linesFromConventions(workspaceMemory?.conventions)
    inferredList.innerHTML = ''
    const inferred = Array.isArray(currentState.memory.inferredMemories) ? currentState.memory.inferredMemories : []
    if (inferred.length === 0) {
      inferredList.innerHTML = `<div class="rw-muted">No inferred memories are waiting for review yet.</div>`
      return
    }
    for (const entry of inferred) {
      const row = document.createElement('div')
      row.className = 'rw-card'
      row.innerHTML = `
        <div class="rw-row rw-space">
          <div>
            <div class="rw-label">${entry.summary}</div>
            <div class="rw-muted">${entry.kind} • ${entry.source} • confidence ${Math.round(entry.confidence * 100)}%</div>
          </div>
          <div class="rw-pill">${entry.status}</div>
        </div>
        <div class="rw-row">
          <div class="rw-muted">${entry.workspaceId || 'Global suggestion'}</div>
        </div>
      `
      const actions = document.createElement('div')
      actions.className = 'rw-row rw-gap'
      if (entry.status !== 'approved') {
        const approveButton = document.createElement('button')
        approveButton.type = 'button'
        approveButton.className = 'rw-btn'
        approveButton.textContent = 'Approve'
        approveButton.addEventListener('click', async () => {
          await rina.memorySetInferredStatus?.(entry.id, 'approved')
          setFeedback('Inferred memory approved.')
          await render()
        })
        actions.appendChild(approveButton)
      }
      if (entry.status !== 'dismissed') {
        const dismissButton = document.createElement('button')
        dismissButton.type = 'button'
        dismissButton.className = 'rw-btn rw-btn-ghost'
        dismissButton.textContent = 'Dismiss'
        dismissButton.addEventListener('click', async () => {
          await rina.memorySetInferredStatus?.(entry.id, 'dismissed')
          setFeedback('Inferred memory dismissed.')
          await render()
        })
        actions.appendChild(dismissButton)
      }
      const removeButton = document.createElement('button')
      removeButton.type = 'button'
      removeButton.className = 'rw-btn rw-btn-ghost'
      removeButton.textContent = 'Delete'
      removeButton.addEventListener('click', async () => {
        await rina.memoryDeleteEntry?.({
          scope: 'profile',
          field: 'inferredMemories',
          value: entry.id,
        })
        setFeedback('Inferred memory deleted.')
        await render()
      })
      actions.appendChild(removeButton)
      row.appendChild(actions)
      inferredList.appendChild(row)
    }
  }

  saveProfileButton.addEventListener('click', async () => {
    await rina.memoryUpdateProfile?.({
      preferredName: preferredNameInput.value,
      tonePreference: toneSelect.value as 'concise' | 'balanced' | 'detailed',
      humorPreference: humorSelect.value as 'low' | 'medium' | 'high',
      likes: splitLines(likesInput.value),
      dislikes: splitLines(dislikesInput.value),
    })
    setFeedback('Owner profile memory saved.')
    await render()
  })

  saveWorkspaceButton.addEventListener('click', async () => {
    if (!currentWorkspaceId) {
      setFeedback('No workspace is resolved yet.')
      return
    }
    await rina.memoryUpdateWorkspace?.(currentWorkspaceId, {
      label: currentWorkspaceId.split('/').pop() || currentWorkspaceId,
      preferredResponseStyle: splitLines(responseStyleInput.value),
      preferredProofStyle: splitLines(proofStyleInput.value),
      conventions: parseConventions(conventionsInput.value),
    })
    setFeedback('Workspace memory saved.')
    await render()
  })

  resetWorkspaceButton.addEventListener('click', async () => {
    if (!currentWorkspaceId) {
      setFeedback('No workspace is resolved yet.')
      return
    }
    await rina.memoryResetWorkspace?.(currentWorkspaceId)
    setFeedback('Workspace memory reset.')
    await render()
  })

  resetAllButton.addEventListener('click', async () => {
    await rina.memoryResetAll?.()
    setFeedback('All explicit memory reset.')
    await render()
  })

  await render()
}
