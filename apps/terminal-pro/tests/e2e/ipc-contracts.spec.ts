import { expect, test } from '@playwright/test'
import { withApp } from './_app'

test('ipc contracts: critical renderer bridges are exposed', async () => {
  await withApp(async ({ page }) => {
    const contract = await page.evaluate(async () => {
      const rina = window.rina as any
      const settingsReady = typeof window.__rinaSettings?.open === 'function'
      const methods = {
        invoke: typeof rina?.invoke === 'function',
        pickWorkspace: typeof rina?.pickWorkspace === 'function',
        workspaceDefault: typeof rina?.workspaceDefault === 'function',
        runsList: typeof rina?.runsList === 'function',
        revealRunReceipt: typeof rina?.revealRunReceipt === 'function',
        licenseState: typeof rina?.licenseState === 'function',
      }
      const workspaceDefault = methods.workspaceDefault ? await rina.workspaceDefault() : null
      const licenseState = methods.licenseState ? await rina.licenseState() : null
      const runsList = methods.runsList ? await rina.runsList(3) : null
      return { settingsReady, methods, workspaceDefault, licenseState, runsList }
    })

    expect(contract.settingsReady).toBe(true)
    expect(contract.methods).toEqual({
      invoke: true,
      pickWorkspace: true,
      workspaceDefault: true,
      runsList: true,
      revealRunReceipt: true,
      licenseState: true,
    })
    expect(contract.workspaceDefault).toMatchObject({ ok: expect.any(Boolean) })
    expect(contract.licenseState).toMatchObject({ tier: expect.any(String) })
    expect(contract.runsList).toMatchObject({ ok: expect.any(Boolean) })
  })
})

test('ipc contracts: settings visibility events match actual panel state', async () => {
  await withApp(async ({ page }) => {
    const transitions = await page.evaluate(async () => {
      const events: boolean[] = []
      const handler = (event: Event) => {
        const detail = (event as CustomEvent<{ open?: boolean }>).detail
        events.push(Boolean(detail?.open))
      }
      window.addEventListener('rina:settings-visibility', handler)
      try {
        window.__rinaSettings?.open()
        await new Promise((resolve) => setTimeout(resolve, 150))
        const openState = window.__rinaSettings?.isOpen() ?? false
        window.__rinaSettings?.close()
        await new Promise((resolve) => setTimeout(resolve, 150))
        const closedState = window.__rinaSettings?.isOpen() ?? true
        return { events, openState, closedState }
      } finally {
        window.removeEventListener('rina:settings-visibility', handler)
      }
    })

    expect(transitions.events).toEqual([true, false])
    expect(transitions.openState).toBe(true)
    expect(transitions.closedState).toBe(false)
  })
})
