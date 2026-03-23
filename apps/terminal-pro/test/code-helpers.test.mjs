import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { createWorkspaceCodeHelpers } = await import('../dist-electron/main/workspace/codeHelpers.js')

function createTempWorkspace(structure) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rina-code-helpers-'))
  for (const [relativePath, content] of Object.entries(structure)) {
    const fullPath = path.join(root, relativePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, content)
  }
  return root
}

function createHelpers(root) {
  return createWorkspaceCodeHelpers({
    appProjectRoot: root,
    dialog: {},
    fs,
    path,
    ptySessions: new Map(),
    normalizeProjectRoot: (input) => path.resolve(String(input || root)),
    resolveProjectRootSafe: (input) => path.resolve(String(input || root)),
    canonicalizePath: (input) => path.resolve(String(input)),
    isWithinRoot: (candidate, workspaceRoot) => {
      const relative = path.relative(path.resolve(workspaceRoot), path.resolve(candidate))
      return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
    },
  })
}

test('listProjectFilesSafe prioritizes entry and config files before tests', () => {
  const workspaceRoot = createTempWorkspace({
    'src/main.ts': 'export {}',
    'src/components/Button.tsx': 'export {}',
    'README.md': '# demo',
    'package.json': '{"name":"demo"}',
    'tests/main.test.ts': 'test()',
  })
  const helpers = createHelpers(workspaceRoot)

  const files = helpers.listProjectFilesSafe(workspaceRoot, 20)

  assert.ok(['src/main.ts', 'package.json', 'README.md'].includes(files[0]))
  assert.ok(files.indexOf('package.json') < files.indexOf('tests/main.test.ts'))
  assert.ok(files.indexOf('src/main.ts') < files.indexOf('tests/main.test.ts'))
  assert.ok(files.indexOf('README.md') < files.indexOf('tests/main.test.ts'))
})

test('listProjectFilesSafe uses query-aware ranking for likely definitions', () => {
  const workspaceRoot = createTempWorkspace({
    'src/auth/authMiddleware.ts': 'export function authMiddleware() {}',
    'src/auth/index.ts': 'export * from "./authMiddleware"',
    'src/routes/users.ts': 'export {}',
    'docs/auth-notes.md': 'auth notes',
  })
  const helpers = createHelpers(workspaceRoot)

  const files = helpers.listProjectFilesSafe(workspaceRoot, 20, 'auth middleware')

  assert.equal(files[0], 'src/auth/authMiddleware.ts')
  assert.ok(files.indexOf('src/auth/index.ts') < files.indexOf('docs/auth-notes.md'))
})
