import type { IpcMain } from 'electron'
import type { shell } from 'electron'
import {
  createCheckoutSession,
  createPortalSession,
  lookupLicenseByEmail,
  type LicenseVerifyResponse,
} from '../../license.js'

export function registerLicenseIpc(deps: {
  ipcMain: IpcMain
  verifyLicense: (customerId: string) => Promise<LicenseVerifyResponse>
  applyVerifiedLicense: (data: LicenseVerifyResponse) => string
  resetLicenseToStarter: () => void
  saveEntitlements: () => void
  refreshLicenseState: () => Promise<{
    tier: string
    has_token: boolean
    expires_at: number | null
    customer_id: string | null
    status: string
  }>
  shell: Pick<typeof shell, 'openExternal'>
  getLicenseState: () => {
    tier: string
    has_token: boolean
    expires_at: number | null
    customer_id: string | null
    status: string
  }
  getCurrentLicenseCustomerId: () => string | null
  getDeviceId: () => string
  getCachedEmail: () => string | null
  setCachedEmail: (email: string) => void
}): void {
  deps.ipcMain.removeHandler('license:verify')
  deps.ipcMain.removeHandler('license:state')
  deps.ipcMain.removeHandler('license:refresh')
  deps.ipcMain.removeHandler('license:portal')
  deps.ipcMain.removeHandler('license:lookup')
  deps.ipcMain.removeHandler('license:checkout')
  deps.ipcMain.removeHandler('license:email')

  deps.ipcMain.handle('license:verify', async (_event, customerId: string) => {
    try {
      const data = await deps.verifyLicense(customerId)
      if (!data?.ok) {
        deps.resetLicenseToStarter()
        throw new Error('license verification returned non-ok response')
      }
      const effectiveTier = deps.applyVerifiedLicense(data)
      deps.saveEntitlements()
      return { ...data, effective_tier: effectiveTier }
    } catch (error) {
      deps.resetLicenseToStarter()
      throw error
    }
  })

  deps.ipcMain.handle('license:state', async () => {
    return deps.getLicenseState()
  })

  deps.ipcMain.handle('license:refresh', async () => {
    return deps.refreshLicenseState()
  })

  deps.ipcMain.handle('license:portal', async (_event, args?: { email?: string }) => {
    try {
      const email = String(args?.email || deps.getCachedEmail() || '')
        .trim()
        .toLowerCase()
      if (!email) return { ok: false, error: 'Email required' }

      deps.setCachedEmail(email)
      const data = await createPortalSession({
        email,
        deviceId: deps.getDeviceId(),
        customerId: deps.getCurrentLicenseCustomerId(),
      })
      if (!data.url) throw new Error('No portal URL returned')
      await deps.shell.openExternal(data.url)
      return { ok: true }
    } catch {
      await deps.shell.openExternal('https://billing.stripe.com/p/login')
      return { ok: true, fallback: true }
    }
  })

  deps.ipcMain.handle('license:lookup', async (_event, email: string) => {
    try {
      const data = await lookupLicenseByEmail(email)
      if (!data.ok) {
        return { ok: false, error: data?.error || 'Lookup failed' }
      }

      return { ok: true, customer_id: data.customer_id }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Lookup failed' }
    }
  })

  deps.ipcMain.handle(
    'license:checkout',
    async (
      _event,
      options: {
        email?: string
        priceId?: string
        tier?: string
        billingCycle?: 'monthly' | 'annual'
        seats?: number
        workspaceId?: string
      }
    ) => {
    try {
      const email = String(options?.email || deps.getCachedEmail() || '')
        .trim()
        .toLowerCase()
      if (!email) return { ok: false, error: 'Email required' }

      deps.setCachedEmail(email)
      const data = await createCheckoutSession({
        email,
        deviceId: deps.getDeviceId(),
        priceId: options?.priceId,
        tier: options?.tier,
        billingCycle: options?.billingCycle,
        seats: options?.seats,
        workspaceId: options?.workspaceId,
      })
      if (!data.url) return { ok: false, error: 'No checkout URL returned' }

      await deps.shell.openExternal(data.url)
      return { ok: true, url: data.url, sessionId: data.sessionId }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Checkout failed' }
    }
    }
  )

  deps.ipcMain.handle('license:email', async () => {
    return { email: deps.getCachedEmail() }
  })
}
