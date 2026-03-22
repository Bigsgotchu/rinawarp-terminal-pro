import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron, type ElectronApplication } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const APP_ROOT = path.resolve(__dirname, '../..')
const MAIN_ENTRY = path.join(APP_ROOT, 'dist-electron', 'main.js')
const ELECTRON_PATH = path.join(APP_ROOT, 'node_modules/electron/dist/electron')
const PACKAGED_LINUX_BINARY = path.join(APP_ROOT, 'dist-electron', 'installer', 'linux-unpacked', 'rinawarp-terminal-pro')

function buildLaunchEnv(extraEnv?: Record<string, string>): NodeJS.ProcessEnv {
  const userDataSuffix =
    extraEnv?.RINAWARP_E2E_USER_DATA_SUFFIX ||
    process.env.RINAWARP_E2E_USER_DATA_SUFFIX ||
    `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`
  return {
    ...process.env,
    RINAWARP_ENV: 'dev',
    RINAWARP_E2E: '1',
    ...extraEnv,
    RINAWARP_E2E_USER_DATA_SUFFIX: userDataSuffix,
  }
}

export async function launchApp(extraEnv?: Record<string, string>): Promise<ElectronApplication> {
  const isLinux = process.platform === 'linux'
  const env = buildLaunchEnv(extraEnv)

  delete env.ELECTRON_RUN_AS_NODE
  if (isLinux) env.ELECTRON_DISABLE_SANDBOX = '1'

  return electron.launch({
    executablePath: ELECTRON_PATH,
    args: [...(isLinux ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] : []), MAIN_ENTRY],
    cwd: APP_ROOT,
    env,
  })
}

export async function launchPackagedApp(extraEnv?: Record<string, string>): Promise<ElectronApplication> {
  const isLinux = process.platform === 'linux'
  const env = buildLaunchEnv(extraEnv)
  delete env.ELECTRON_RUN_AS_NODE
  if (isLinux) {
    env.HOME = env.HOME || process.env.HOME
    env.XDG_CONFIG_HOME = env.XDG_CONFIG_HOME || path.join(String(env.HOME), '.config')
    env.XDG_DATA_HOME = env.XDG_DATA_HOME || path.join(String(env.HOME), '.local', 'share')
  }

  return electron.launch({
    executablePath: PACKAGED_LINUX_BINARY,
    args: [...(isLinux ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] : [])],
    cwd: APP_ROOT,
    env,
  })
}
