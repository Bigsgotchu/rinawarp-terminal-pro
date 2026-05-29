import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { safeWrite, safeDelete, filesystemTool } = await import('../dist-electron/rina/tools/filesystem.js')
const { RefactorAgent } = await import('../dist-electron/rina/agents/refactorAgent.js')

function withTempFile(content = 'var value = 1\n') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-legacy-mutation-'))
  const file = path.join(dir, 'sample.js')
  fs.writeFileSync(file, content, 'utf8')
  return { dir, file }
}

test('legacy filesystem helpers cannot write or delete files', async () => {
  const { dir, file } = withTempFile()
  try {
    assert.equal(await safeWrite(file, 'changed'), false)
    assert.equal(fs.readFileSync(file, 'utf8'), 'var value = 1\n')

    assert.equal(await safeDelete(file), false)
    assert.equal(fs.existsSync(file), true)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('legacy filesystem tool blocks write and delete actions', async () => {
  const { dir, file } = withTempFile()
  const context = { mode: 'auto', workspaceRoot: dir }
  try {
    const writeResult = await filesystemTool.execute(
      { tool: 'filesystem', input: { action: 'write', path: file, content: 'changed' } },
      context,
    )
    assert.equal(writeResult.ok, false)
    assert.equal(writeResult.blocked, true)
    assert.equal(fs.readFileSync(file, 'utf8'), 'var value = 1\n')

    const deleteResult = await filesystemTool.execute(
      { tool: 'filesystem', input: { action: 'delete', path: file } },
      context,
    )
    assert.equal(deleteResult.ok, false)
    assert.equal(deleteResult.blocked, true)
    assert.equal(fs.existsSync(file), true)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('legacy refactor agent does not write backups or overwrite files', async () => {
  const { dir, file } = withTempFile()
  const agent = new RefactorAgent()
  try {
    const result = await agent.refactorFile(file)
    assert.equal(result.success, false)
    assert.match(result.message, /blocked/i)
    assert.equal(fs.readFileSync(file, 'utf8'), 'var value = 1\n')
    assert.equal(fs.existsSync(`${file}.bak`), false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
