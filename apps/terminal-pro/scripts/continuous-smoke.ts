/**
 * Continuous Smoke Test Script
 *
 * Runs a quick health check on Rina's tools before launching the terminal.
 * Workspace-isolated: no system files are touched.
 *
 * Run with: node scripts/continuous-smoke.ts
 */

import path from 'path'
import fs from 'fs'
import { rinaController, rinaPersona } from '../src/rina/index.js'

async function runSmoke(): Promise<void> {
  console.log('🟢 Running Continuous Rina Smoke Test...')

  // Set up a temporary workspace
  const tmpDir = path.join(process.cwd(), 'tmp-smoke-continuous')
  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }
  } catch {
    // Directory may already exist
  }

  rinaController.setWorkspaceRoot(tmpDir)
  rinaController.setMode('assist') // safe default

  try {
    // 1. Personality test
    console.log('🎭 Testing personality...')
    const context = rinaPersona.getContext()
    console.log('🤖 Personality mood:', context.mood)

    // 2. Safe terminal command
    console.log('💻 Testing terminal...')
    const termResult = await rinaController.tools.terminal.runTerminalCommand('echo Rina Test', [], 'assist')
    if (!termResult.ok) {
      throw new Error(`Terminal failed: ${termResult.error}`)
    }
    const termOutput = termResult.output as { output?: string; success?: boolean }
    console.log('   Terminal output:', termOutput.output)

    // 3. Filesystem test
    console.log('📁 Testing filesystem...')
    const testFile = path.join(tmpDir, 'continuous.txt')

    await rinaController.tools.filesystem.writeFileSafe(testFile, 'smoke test content')

    const readResult = await rinaController.tools.filesystem.readFileSafe(testFile)
    if (!readResult.ok) {
      throw new Error(`Filesystem read failed: ${readResult.error}`)
    }
    const fileContent = readResult.output as { content?: string }
    console.log('   File content:', fileContent.content)

    const listResult = await rinaController.tools.filesystem.listDirSafe(tmpDir)
    if (!listResult.ok) {
      throw new Error(`Filesystem list failed: ${listResult.error}`)
    }
    const files = listResult.output as { files?: string[] }
    console.log('   Directory files:', files.files?.join(', '))

    // 4. System info test
    console.log('⚙️ Testing system tool...')
    const sysInfo = rinaController.tools.system.getSystemInfo()
    console.log('   System platform:', sysInfo.platform, '| arch:', sysInfo.arch)

    const rebootResult = await rinaController.tools.system.rebootSystem('explain')
    console.log('   Reboot (explain):', (rebootResult.output as { message?: string })?.message)

    // 5. Safety test - blocked command
    console.log('🛡️ Testing safety...')
    const blockedResult = await rinaController.tools.terminal.runTerminalCommand('rm -rf /', [], 'auto')
    if (blockedResult.ok !== false) {
      throw new Error('Blocked command should have been rejected!')
    }
    console.log('   Blocked dangerous command: ✓')

    // 6. Cleanup
    await rinaController.tools.filesystem.deleteFileSafe(testFile)

    // Remove temp directory
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true })
    }

    console.log('✅ Continuous smoke test completed safely!\n')
  } catch (err) {
    console.error('❌ Smoke test failed:', err)

    // Cleanup on failure
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true })
    }

    process.exit(1)
  }
}

runSmoke().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
