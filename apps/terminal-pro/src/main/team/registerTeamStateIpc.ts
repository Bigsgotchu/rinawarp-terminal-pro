import type { IpcMain } from 'electron'

type TeamMember = {
  email: string
  role: string
}

type TeamDb = {
  workspaceId?: string
  currentUser?: string
  currentRole?: string
  members?: TeamMember[]
  seatsAllowed?: number
}

type TeamStateResult = {
  ok: boolean
  error?: string
  workspaceId: string
  currentUser: string
  currentRole: string
  members: TeamMember[]
  seatsAllowed: number
  seatsUsed: number
}

type RegisterTeamStateIpcDeps = {
  ipcMain: IpcMain
  loadTeamDb: () => TeamDb
  getCurrentRole: () => string
}

function buildTeamStateSuccess(team: TeamDb, getCurrentRole: () => string): TeamStateResult {
  const members = Array.isArray(team?.members) ? team.members : []
  const currentUser = String(team?.currentUser || 'owner@local')
  const currentRole = getCurrentRole()

  return {
    ok: true,
    workspaceId: String(team?.workspaceId || ''),
    currentUser,
    currentRole,
    members,
    seatsAllowed: Math.max(1, Number(team?.seatsAllowed || members.length || 1)),
    seatsUsed: members.length,
  }
}

function buildTeamStateError(error: unknown): TeamStateResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : 'Could not load team state',
    workspaceId: '',
    currentUser: 'owner@local',
    currentRole: 'owner',
    members: [{ email: 'owner@local', role: 'owner' }],
    seatsAllowed: 1,
    seatsUsed: 1,
  }
}

export function registerTeamStateIpc(deps: RegisterTeamStateIpcDeps): void {
  const { ipcMain, loadTeamDb, getCurrentRole } = deps

  ipcMain.removeHandler('team:state')
  ipcMain.handle('team:state', async () => {
    try {
      return buildTeamStateSuccess(loadTeamDb(), getCurrentRole)
    } catch (error) {
      return buildTeamStateError(error)
    }
  })
}
