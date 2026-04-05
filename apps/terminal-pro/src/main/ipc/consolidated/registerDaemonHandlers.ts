import {
  listSharedWorkspaceFiles,
  readSharedWorkspaceTextFile,
  resolveSharedWorkspaceCwd,
} from '../../runtime/runtimeAccess.js'
import type { CodeListFilesArgs, CodeReadFileArgs } from '../../startup/runtimeTypes.js'
import type { ConsolidatedIpcArgs } from './types.js'

export function registerDaemonHandlers({
  ipcMain,
  daemonStatus,
  daemonTasks,
  daemonTaskAdd,
  daemonStart,
  daemonStop,
  runsList,
  runsTail,
  runsArtifacts,
  codeListFiles,
  codeReadFile,
  runAgent,
  conversationRoute,
  handleConversationTurn,
  getStatus,
  getMode,
  setMode,
  getPlans,
  getTools,
}: ConsolidatedIpcArgs): void {
  const workspaceListFiles = async (args: CodeListFilesArgs) => {
    const files = await listSharedWorkspaceFiles(args.projectRoot, {
      limit: args.limit,
      query: args.query,
    })

    if (files) {
      return { files }
    }

    if (!codeListFiles) {
      throw new Error('Workspace service unavailable')
    }

    return codeListFiles(args)
  }

  const workspaceReadFile = async (args: CodeReadFileArgs) => {
    const projectRoot = resolveSharedWorkspaceCwd(args.projectRoot)
    const content = await readSharedWorkspaceTextFile(projectRoot, args.relativePath)

    if (content !== null) {
      return { content }
    }

    if (!codeReadFile) {
      throw new Error('Workspace service unavailable')
    }

    return codeReadFile(args)
  }

  ipcMain.handle('daemon:status', async () => {
    try {
      return await daemonStatus()
    } catch (error) {
      console.error('[IPC] daemon:status error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('daemon:tasks', async (_event, args) => {
    try {
      return await daemonTasks(args)
    } catch (error) {
      console.error('[IPC] daemon:tasks error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('daemon:add', async (_event, args) => {
    try {
      return await daemonTaskAdd(args)
    } catch (error) {
      console.error('[IPC] daemon:add error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('daemon:start', async () => {
    try {
      return await daemonStart()
    } catch (error) {
      console.error('[IPC] daemon:start error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('daemon:stop', async () => {
    try {
      return await daemonStop()
    } catch (error) {
      console.error('[IPC] daemon:stop error:', error)
      return { ok: false, error: String(error) }
    }
  })

  if (runsTail) {
    ipcMain.removeHandler('rina:runs:tail')
    ipcMain.handle('rina:runs:tail', async (_event, args) => {
      try {
        return await runsTail(args)
      } catch (error) {
        console.error('[IPC] rina:runs:tail error:', error)
        return { ok: false, error: String(error) }
      }
    })
  }

  if (runsList) {
    ipcMain.removeHandler('rina:runs:list')
    ipcMain.handle('rina:runs:list', async (_event, args) => {
      try {
        return await runsList(args)
      } catch (error) {
        console.error('[IPC] rina:runs:list error:', error)
        return { ok: false, error: String(error) }
      }
    })
  }

  if (runsArtifacts) {
    ipcMain.removeHandler('rina:runs:artifacts')
    ipcMain.handle('rina:runs:artifacts', async (_event, args) => {
      try {
        return await runsArtifacts(args)
      } catch (error) {
        console.error('[IPC] rina:runs:artifacts error:', error)
        return { ok: false, error: String(error) }
      }
    })
  }

  if (codeListFiles) {
    ipcMain.removeHandler('rina:code:listFiles')
    ipcMain.handle('rina:code:listFiles', async (_event, args: CodeListFilesArgs) => {
      try {
        return await workspaceListFiles(args)
      } catch (error) {
        console.error('[IPC] rina:code:listFiles error:', error)
        throw error instanceof Error ? error : new Error(String(error))
      }
    })
  }

  if (codeReadFile) {
    ipcMain.removeHandler('rina:code:readFile')
    ipcMain.handle('rina:code:readFile', async (_event, args: CodeReadFileArgs) => {
      try {
        return await workspaceReadFile(args)
      } catch (error) {
        console.error('[IPC] rina:code:readFile error:', error)
        throw error instanceof Error ? error : new Error(String(error))
      }
    })
  }

  if (runAgent) {
    ipcMain.removeHandler('rina:runAgent')
    ipcMain.handle('rina:runAgent', async (_event, prompt, opts) => {
      try {
        return await runAgent(String(prompt || ''), opts)
      } catch (error) {
        console.error('[IPC] rina:runAgent error:', error)
        return { ok: false, error: String(error), text: String(error) }
      }
    })
  }

  if (conversationRoute) {
    ipcMain.removeHandler('rina:conversation:route')
    ipcMain.handle('rina:conversation:route', async (_event, prompt, opts) => {
      try {
        return await conversationRoute(String(prompt || ''), opts)
      } catch (error) {
        console.error('[IPC] rina:conversation:route error:', error)
        return {
          rawText: String(prompt || ''),
          mode: 'unclear',
          confidence: 0,
          references: {},
          allowedNextAction: 'clarify',
          clarification: {
            required: true,
            reason: String(error),
            question: 'I can help with that, but I need one anchor: do you mean the current workspace or the last run?',
          },
        }
      }
    })
  }

  if (handleConversationTurn) {
    ipcMain.removeHandler('rina:conversation:turn')
    ipcMain.handle('rina:conversation:turn', async (_event, prompt, opts) => {
      try {
        return await handleConversationTurn(String(prompt || ''), opts)
      } catch (error) {
        console.error('[IPC] rina:conversation:turn error:', error)
        return {
          rawText: String(prompt || ''),
          mode: 'unclear',
          confidence: 0,
          references: {},
          allowedNextAction: 'clarify',
          requiresAction: false,
          assistantReply: 'I can help with that, but I need one anchor first.',
          clarification: {
            required: true,
            reason: String(error),
            question: 'Do you mean the current workspace or the last run?',
          },
        }
      }
    })
  }

  if (getStatus) {
    ipcMain.removeHandler('rina:getStatus')
    ipcMain.handle('rina:getStatus', async () => {
      try {
        return await getStatus()
      } catch (error) {
        console.error('[IPC] rina:getStatus error:', error)
        throw error instanceof Error ? error : new Error(String(error))
      }
    })
  }

  if (getMode) {
    ipcMain.removeHandler('rina:getMode')
    ipcMain.handle('rina:getMode', async () => {
      try {
        return await getMode()
      } catch (error) {
        console.error('[IPC] rina:getMode error:', error)
        throw error instanceof Error ? error : new Error(String(error))
      }
    })
  }

  if (setMode) {
    ipcMain.removeHandler('rina:setMode')
    ipcMain.handle('rina:setMode', async (_event, mode) => {
      try {
        await setMode(String(mode || ''))
        return { ok: true, mode }
      } catch (error) {
        console.error('[IPC] rina:setMode error:', error)
        return { ok: false, error: String(error) }
      }
    })
  }

  if (getPlans) {
    ipcMain.removeHandler('rina:getPlans')
    ipcMain.handle('rina:getPlans', async () => {
      try {
        return await getPlans()
      } catch (error) {
        console.error('[IPC] rina:getPlans error:', error)
        throw error instanceof Error ? error : new Error(String(error))
      }
    })
  }

  if (getTools) {
    ipcMain.removeHandler('rina:getTools')
    ipcMain.handle('rina:getTools', async () => {
      try {
        return await getTools()
      } catch (error) {
        console.error('[IPC] rina:getTools error:', error)
        throw error instanceof Error ? error : new Error(String(error))
      }
    })
  }
}
