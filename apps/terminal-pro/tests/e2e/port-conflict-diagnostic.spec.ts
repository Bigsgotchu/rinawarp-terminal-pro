import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import net from 'node:net'
import { test, expect } from '@playwright/test'
import { withApp } from './_app'

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not allocate a test port.')))
        return
      }
      const port = address.port
      server.close(() => resolve(port))
    })
  })
}

async function startPortHolder(port: number): Promise<ChildProcessWithoutNullStreams> {
  const child = spawn(
    process.execPath,
    [
      '-e',
      [
        'const net = require("node:net");',
        'const port = Number(process.argv[1]);',
        'const server = net.createServer((socket) => socket.end("ok"));',
        'server.listen(port, "127.0.0.1", () => console.log("ready"));',
        'process.stdin.resume();',
      ].join(''),
      String(port),
    ],
    { stdio: ['pipe', 'pipe', 'pipe'] }
  )

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for test port holder.')), 5_000)
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes('ready')) {
        clearTimeout(timer)
        resolve()
      }
    })
    child.once('exit', () => {
      clearTimeout(timer)
      reject(new Error('Test port holder exited early.'))
    })
  })

  return child
}

function isRunning(child: ChildProcessWithoutNullStreams): boolean {
  if (child.exitCode !== null || child.signalCode !== null) return false
  try {
    process.kill(child.pid ?? -1, 0)
    return true
  } catch {
    return false
  }
}

function cleanupChild(child: ChildProcessWithoutNullStreams): void {
  if (isRunning(child)) {
    child.kill('SIGKILL')
  }
}

test.describe('Rina port conflict diagnostic', () => {
  test('asks for a port when the port prompt has no number', async () => {
    await withApp(async ({ page }) => {
      await expect(page.locator('[data-testid="rina-panel"]')).toBeVisible()

      const input = page.getByTestId('rina-chat-input')
      await input.fill('What is using this port?')
      await input.press('Enter')

      await expect(page.locator('[data-testid="rina-chat-history"]')).toContainText('Which port should I inspect?')
    })
  })

  test('routes chat prompt and denies stop without killing the process', async () => {
    const port = await getFreePort()
    const child = await startPortHolder(port)
    const pid = child.pid
    if (!pid) throw new Error('Expected child PID.')

    try {
      await withApp(async ({ page }) => {
        await expect(page.locator('[data-testid="rina-panel"]')).toBeVisible()

        const input = page.getByTestId('rina-chat-input')
        await input.fill(`What is using port ${port}?`)
        await input.press('Enter')

        await expect(page.locator('[data-testid="rina-chat-history"]')).toContainText(
          `I'll check what is listening on port ${port}`,
          { timeout: 10_000 }
        )
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('ready', { timeout: 30_000 })
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText(`lsof -i :${port} -P -n`)
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText(`ss -ltnp "sport = :${port}"`)
        await expect(page.locator('[data-testid="port-findings"]')).toContainText(`Port ${port}`)
        await expect(page.locator('[data-testid="port-findings"]')).toContainText(String(pid))
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText(`kill ${pid}`)
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('Expected effect')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('Rollback awareness')

        await page.locator('[data-testid="deny-port-stop"]').click()
        await expect(page.locator('[data-testid="port-stop-state"]')).toContainText('denied')
        await expect(page.locator('[data-testid="rina-chat-history"]')).toContainText('Action denied')
        expect(isRunning(child)).toBe(true)
      })
    } finally {
      cleanupChild(child)
    }
  })

  test('approves selected kill command and verifies the port is free', async () => {
    const port = await getFreePort()
    const child = await startPortHolder(port)
    const pid = child.pid
    if (!pid) throw new Error('Expected child PID.')

    try {
      await withApp(async ({ page }) => {
        await expect(page.locator('[data-testid="rina-panel"]')).toBeVisible()

        const input = page.getByTestId('rina-chat-input')
        await input.fill(`kill whatever is on port ${port}`)
        await input.press('Enter')

        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('ready', { timeout: 30_000 })
        await expect(page.locator('[data-testid="port-findings"]')).toContainText(String(pid))
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText(`kill ${pid}`)

        await page.locator('[data-testid="approve-port-stop"]').click()
        await expect(page.locator('[data-testid="port-stop-state"]')).toContainText(/done|error/, {
          timeout: 20_000,
        })
        await expect(page.locator('[data-testid="port-stop-state"]')).toContainText(`port ${port} is free`)
        await expect(page.locator('[data-testid="rina-chat-history"]')).toContainText(`Port ${port}`)
        await expect(page.locator('[data-testid="rina-chat-history"]')).toContainText(String(pid))
        await expect(page.locator('[data-testid="rina-chat-history"]')).toContainText('now free')
      })
    } finally {
      cleanupChild(child)
    }
  })
})
