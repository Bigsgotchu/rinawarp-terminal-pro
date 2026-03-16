import type { IpcMain } from 'electron'
import {
  DEFAULT_PERSONA,
  type PersonalityStore,
  generatePersonalityPrefix,
  generatePersonalityReply,
} from '../../personality.js'
import type { AppContext } from '../context.js'

export function registerPersonalityIpc(args: {
  ipcMain: IpcMain
  ctx: AppContext
  personalityStore: PersonalityStore
}) {
  args.ipcMain.handle(
    'rina:personality:reply',
    async (
      _event,
      payload: {
        userId: string
        message: string
        isTaskContext: boolean
      }
    ) => {
      const reply = await generatePersonalityReply({
        persona: DEFAULT_PERSONA,
        store: args.personalityStore,
        ctx: {
          userId: payload.userId || 'local-user',
          userMessage: payload.message || '',
          isTaskContext: !!payload.isTaskContext,
          now: Date.now(),
        },
      })
      return reply
    }
  )

  args.ipcMain.handle(
    'rina:personality:prefix',
    async (
      _event,
      payload: {
        userId: string
        message: string
      }
    ) => {
      const result = await generatePersonalityPrefix({
        persona: DEFAULT_PERSONA,
        store: args.personalityStore,
        ctx: {
          userId: payload.userId || 'local-user',
          userMessage: payload.message || '',
          isTaskContext: true,
          now: Date.now(),
        },
      })
      return result
    }
  )
}
