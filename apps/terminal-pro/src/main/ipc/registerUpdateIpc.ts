import type { App, IpcMain } from 'electron'
import type { shell } from 'electron'
import type fs from 'node:fs'
import type path from 'node:path'
import { createUpdateService, type UpdateConfig } from '../update/updateService.js'

type RegisterUpdateIpcDeps = {
  ipcMain: IpcMain
  app: App
  fs: typeof fs
  path: typeof path
  shell: Pick<typeof shell, 'openExternal'>
}

const DEFAULT_CONFIG: UpdateConfig = {
  channel: 'stable',
  autoCheck: true,
  autoDownload: false,
}

export function registerUpdateIpc(deps: RegisterUpdateIpcDeps): void {
  const configFile = () => deps.path.join(deps.app.getPath('userData'), 'update-config.json')

  const readConfig = (): UpdateConfig => {
    try {
      const raw = deps.fs.readFileSync(configFile(), 'utf8')
      const parsed = JSON.parse(raw) as Partial<UpdateConfig>
      return {
        channel: parsed.channel === 'beta' || parsed.channel === 'nightly' ? parsed.channel : 'stable',
        autoCheck: parsed.autoCheck !== false,
        autoDownload: parsed.autoDownload === true,
      }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }

  const writeConfig = (config: UpdateConfig): UpdateConfig => {
    deps.fs.writeFileSync(configFile(), JSON.stringify(config, null, 2), 'utf8')
    return config
  }

  const updateService = createUpdateService({
    app: deps.app,
    shell: deps.shell,
  })

  updateService.setConfig(readConfig())

  deps.ipcMain.removeHandler('app:version')
  deps.ipcMain.handle('app:version', async () => deps.app.getVersion())

  deps.ipcMain.removeHandler('app:updateConfig:get')
  deps.ipcMain.handle('app:updateConfig:get', async () => updateService.getConfig())

  deps.ipcMain.removeHandler('app:updateConfig:set')
  deps.ipcMain.handle('app:updateConfig:set', async (_event, input) => {
    const next = {
      channel: input?.channel === 'beta' || input?.channel === 'nightly' ? input.channel : 'stable',
      autoCheck: input?.autoCheck !== false,
      autoDownload: input?.autoDownload === true,
    } satisfies UpdateConfig
    const config = writeConfig(next)
    updateService.setConfig(config)
    return { ok: true, config }
  })

  deps.ipcMain.removeHandler('app:updateState')
  deps.ipcMain.handle('app:updateState', async () => updateService.getState())

  deps.ipcMain.removeHandler('app:checkForUpdate')
  deps.ipcMain.handle('app:checkForUpdate', async () => updateService.checkForUpdate())

  deps.ipcMain.removeHandler('app:openUpdateDownload')
  deps.ipcMain.handle('app:openUpdateDownload', async () => updateService.openUpdateDownload())

  deps.ipcMain.removeHandler('app:installUpdate')
  deps.ipcMain.handle('app:installUpdate', async () => updateService.installUpdate())

  deps.ipcMain.removeHandler('app:releaseInfo')
  deps.ipcMain.handle('app:releaseInfo', async () => updateService.getReleaseInfo())

  deps.ipcMain.removeHandler('app:verifyRelease')
  deps.ipcMain.handle('app:verifyRelease', async () => updateService.verifyRelease())

  updateService.scheduleStartupCheck()
}
