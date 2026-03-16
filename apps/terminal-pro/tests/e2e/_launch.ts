import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron, type ElectronApplication } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const APP_ROOT = path.resolve(__dirname, '../..')
const MAIN_ENTRY = path.join(APP_ROOT, 'dist-electron', 'main.js')
const ELECTRON_PATH = path.join(APP_ROOT, 'node_modules/electron/dist/electron')

export async function launchApp(extraEnv?: Record<string, string>): Promise<ElectronApplication> {
  const isE2E = process.env.RINAWARP_E2E === '1' || process.env.CI === '1' || process.env.CI === 'true'
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    RINAWARP_ENV: 'dev',
    RINAWARP_E2E: '1',
    ...extraEnv,
  }

  delete env.ELECTRON_RUN_AS_NODE
  if (isE2E) env.ELECTRON_DISABLE_SANDBOX = '1'

  return electron.launch({
    executablePath: ELECTRON_PATH,
    args: [...(isE2E ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] : []), MAIN_ENTRY],
    cwd: APP_ROOT,
    env,
  })
}
