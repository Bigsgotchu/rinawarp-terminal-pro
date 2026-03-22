import type { IpcMain } from 'electron'

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

export function registerMemoryIpc(deps: {
  ipcMain: IpcMain
  getState: () => MemoryState
  updateProfile: (input: Partial<MemoryState['memory']['profile']>) => MemoryState
  updateWorkspace: (
    workspaceId: string,
    input: {
      label?: string
      preferredResponseStyle?: string[]
      preferredProofStyle?: string[]
      conventions?: Array<{ key: string; value: string }>
    }
  ) => MemoryState
  resetWorkspace: (workspaceId: string) => MemoryState
  resetAll: () => MemoryState
  setInferredMemoryStatus: (id: string, status: 'approved' | 'dismissed') => MemoryState
  deleteEntry: (args: {
    scope: 'profile' | 'workspace'
    field: 'likes' | 'dislikes' | 'preferredResponseStyle' | 'preferredProofStyle' | 'conventions' | 'inferredMemories'
    workspaceId?: string
    value?: string
    key?: string
  }) => MemoryState
}): void {
  deps.ipcMain.removeHandler('rina:memory:getState')
  deps.ipcMain.removeHandler('rina:memory:updateProfile')
  deps.ipcMain.removeHandler('rina:memory:updateWorkspace')
  deps.ipcMain.removeHandler('rina:memory:deleteEntry')
  deps.ipcMain.removeHandler('rina:memory:setInferredStatus')
  deps.ipcMain.removeHandler('rina:memory:resetWorkspace')
  deps.ipcMain.removeHandler('rina:memory:resetAll')

  deps.ipcMain.handle('rina:memory:getState', async () => deps.getState())
  deps.ipcMain.handle('rina:memory:updateProfile', async (_event, input) => deps.updateProfile(input || {}))
  deps.ipcMain.handle('rina:memory:updateWorkspace', async (_event, workspaceId, input) => deps.updateWorkspace(String(workspaceId || ''), input || {}))
  deps.ipcMain.handle('rina:memory:deleteEntry', async (_event, input) => deps.deleteEntry(input || {}))
  deps.ipcMain.handle('rina:memory:setInferredStatus', async (_event, id, status) =>
    deps.setInferredMemoryStatus(String(id || ''), status === 'dismissed' ? 'dismissed' : 'approved')
  )
  deps.ipcMain.handle('rina:memory:resetWorkspace', async (_event, workspaceId) => deps.resetWorkspace(String(workspaceId || '')))
  deps.ipcMain.handle('rina:memory:resetAll', async () => deps.resetAll())
}
