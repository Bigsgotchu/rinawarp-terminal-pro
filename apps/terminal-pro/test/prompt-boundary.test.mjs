import test from 'node:test'
import assert from 'node:assert/strict'

const { detectCommandBoundaries, extractParameterKeys, applyParameters } =
  await import('../dist-electron/prompt-boundary.js')

test('detects bash/zsh boundaries', () => {
  const transcript = [
    'karina@host:~/repo$ git status',
    'On branch main',
    'nothing to commit',
    'karina@host:~/repo$ npm test',
    'ok 1 - test suite',
  ].join('\n')
  const rows = detectCommandBoundaries(transcript)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].command, 'git status')
  assert.match(rows[0].output, /On branch main/)
  assert.equal(rows[1].command, 'npm test')
})

test('detects fish boundaries', () => {
  const transcript = ['~/repo> ls -la', 'total 42', '~/repo> echo done', 'done'].join('\n')
  const rows = detectCommandBoundaries(transcript, 'fish')
  assert.equal(rows.length, 2)
  assert.equal(rows[0].command, 'ls -la')
  assert.equal(rows[1].command, 'echo done')
})

test('detects pwsh boundaries', () => {
  const transcript = [
    'PS C:\\Users\\karina> Get-ChildItem',
    'Mode LastWriteTime Length Name',
    'PS C:\\Users\\karina> Write-Host done',
    'done',
  ].join('\n')
  const rows = detectCommandBoundaries(transcript)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].shell, 'pwsh')
  assert.equal(rows[0].command, 'Get-ChildItem')
})

test('handles ansi-colored prompts', () => {
  const transcript = ['\u001b[32mkarina@host:~/repo$\u001b[0m echo hello', 'hello'].join('\n')
  const rows = detectCommandBoundaries(transcript)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].command, 'echo hello')
})

test('handles multiline continuation prompts', () => {
  const transcript = [
    'karina@host:~/repo$ echo one \\',
    '> two',
    'one two',
    'karina@host:~/repo$ printf done',
    'done',
  ].join('\n')
  const rows = detectCommandBoundaries(transcript)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].command, 'echo one \\\ntwo')
  assert.match(rows[0].output, /one two/)
})

test('handles symbol prompts (starship-like)', () => {
  const transcript = ['❯ npm run build', 'ok', '❯ git status', 'clean'].join('\n')
  const rows = detectCommandBoundaries(transcript, 'zsh')
  assert.equal(rows.length, 2)
  assert.equal(rows[1].command, 'git status')
})

test('handles bare dollar/hash prompts', () => {
  const transcript = ['$ echo hi', 'hi', '# whoami', 'root'].join('\n')
  const rows = detectCommandBoundaries(transcript, 'bash')
  assert.equal(rows.length, 2)
  assert.equal(rows[0].command, 'echo hi')
  assert.equal(rows[1].command, 'whoami')
})

test('handles continuation without forced whitespace payload', () => {
  const transcript = ['PS C:\\repo> Write-Host "one" `', '>> "two"', 'one two'].join('\n')
  const rows = detectCommandBoundaries(transcript)
  assert.equal(rows.length, 1)
  assert.match(rows[0].command, /Write-Host/)
  assert.match(rows[0].command, /"two"/)
})

test('does not create blocks from plain output lines', () => {
  const transcript = ['error #1 happened', 'nothing else', 'done'].join('\n')
  const rows = detectCommandBoundaries(transcript)
  assert.equal(rows.length, 0)
})

test('extracts and applies runbook parameters', () => {
  const cmd = 'lsof -i :{{PORT}} && echo {{PORT}} {{ENV}}'
  const keys = extractParameterKeys(cmd)
  assert.deepEqual(keys.sort(), ['ENV', 'PORT'])
  const rendered = applyParameters(cmd, { PORT: '3000', ENV: 'prod' })
  assert.equal(rendered, 'lsof -i :3000 && echo 3000 prod')
})
