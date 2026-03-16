import type { IpcMain } from 'electron'
import type { shell } from 'electron'
import type { LicenseVerifyResponse } from '../../license.js'
import type { AppContext } from '../context.js'

export function registerLicenseIpc(deps: {
  ipcMain: IpcMain
  ctx: AppContext
  verifyLicense: (customerId: string) => Promise<LicenseVerifyResponse>
  applyVerifiedLicense: (data: LicenseVerifyResponse) => string
  resetLicenseToStarter: () => void
  saveEntitlements: () => void
  shell: Pick<typeof shell, 'openExternal'>
  getLicenseState: () => {
    tier: string
    has_token: boolean
    expires_at: number | null
    customer_id: string | null
    status: string
  }
  getCurrentLicenseCustomerId: () => string | null
}): void {
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

  deps.ipcMain.handle('license:portal', async () => {
    try {
      const res = await fetch('https://api.rinawarptech.com/api/license/portal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customer_id: deps.getCurrentLicenseCustomerId() }),
      })

      if (!res.ok) {
        throw new Error(`Portal request failed: ${res.status}`)
      }

      const data = (await res.json()) as { url?: string }
      if (data.url) {
        await deps.shell.openExternal(data.url)
        return { ok: true }
      }
      throw new Error('No portal URL returned')
    } catch {
      await deps.shell.openExternal('https://billing.stripe.com/p/login')
      return { ok: true, fallback: true }
    }
  })

  deps.ipcMain.handle('license:lookup', async (_event, email: string) => {
    try {
      const res = await fetch('https://api.rinawarptech.com/api/license/lookup-by-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = (await res.json()) as { ok: boolean; customer_id?: string; error?: string }

      if (!res.ok || !data.ok) {
        return { ok: false, error: data?.error || `Lookup failed (${res.status})` }
      }

      return { ok: true, customer_id: data.customer_id }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Lookup failed' }
    }
  })
}
