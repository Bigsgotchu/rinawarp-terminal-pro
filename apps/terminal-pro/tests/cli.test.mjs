// CLI Command Test - Uses Node's built-in test runner
// Run: node --test tests/cli.test.ts

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

describe('CLI Command Tests', () => {
  it('should execute simple echo command', async () => {
    const { stdout } = await execAsync('echo hello')
    assert.strictEqual(stdout.trim(), 'hello')
  })

  it('should execute pwd command', async () => {
    const { stdout } = await execAsync('pwd')
    assert.ok(stdout.length > 0)
  })

  it('should handle command with pipes', async () => {
    const { stdout } = await execAsync('echo "test output" | head -n 1')
    assert.ok(stdout.includes('test output'))
  })

  it('should handle working directory context', async () => {
    const { stdout } = await execAsync('ls -1 | head -5')
    // Just verify the command runs without error
    assert.ok(typeof stdout === 'string')
  })
})