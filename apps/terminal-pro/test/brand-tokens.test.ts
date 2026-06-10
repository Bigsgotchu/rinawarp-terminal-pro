import { describe, it, assert } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

describe('Brand Tokens', () => {
  it('defines RinaWarp brand color tokens', () => {
    const tokensPath = path.join(__dirname, '..', 'src', 'renderer', 'workbench', 'theme.tokens.css')
    const content = fs.readFileSync(tokensPath, 'utf8')

    assert.ok(content.includes('--rina-hot-pink'), 'Missing --rina-hot-pink token')
    assert.ok(content.includes('--rina-coral'), 'Missing --rina-coral token')
    assert.ok(content.includes('--rina-teal'), 'Missing --rina-teal token')
    assert.ok(content.includes('--rina-blue'), 'Missing --rina-blue token')
    assert.ok(content.includes('--rina-bg'), 'Missing --rina-bg token')
    assert.ok(content.includes('--rina-surface'), 'Missing --rina-surface token')
    assert.ok(content.includes('--rina-text'), 'Missing --rina-text token')
    assert.ok(content.includes('--rina-muted'), 'Missing --rina-muted token')
  })

  it('uses RinaWarp colors as primary references', () => {
    const tokensPath = path.join(__dirname, '..', 'src', 'renderer', 'workbench', 'theme.tokens.css')
    const content = fs.readFileSync(tokensPath, 'utf8')

    assert.ok(content.includes('--accent-pink: var(--rina-hot-pink)'), 'accent-pink should reference --rina-hot-pink')
    assert.ok(content.includes('--accent-cyan: var(--rina-teal)'), 'accent-cyan should reference --rina-teal')
    assert.ok(content.includes('--rw-hotpink: var(--rina-hot-pink)'), 'rw-hotpink should reference --rina-hot-pink')
    assert.ok(content.includes('--rw-coral: var(--rina-coral)'), 'rw-coral should reference --rina-coral')
    assert.ok(content.includes('--rw-teal: var(--rina-teal)'), 'rw-teal should reference --rina-teal')
  })

  it('does not use neon green as primary color', () => {
    const stylesDir = path.join(__dirname, '..', 'src', 'renderer', 'styles')
    const cssFiles = walkDir(stylesDir, ['.css'])

    for (const file of cssFiles) {
      const content = fs.readFileSync(file, 'utf8')
      assert.ok(!content.includes('#00ff00'), `${path.relative(stylesDir, file)} contains neon green #00ff00`)
      assert.ok(!content.includes('#00FF00'), `${path.relative(stylesDir, file)} contains neon green #00FF00`)
    })
  })
})

function walkDir(dir, extensions) {
  if (!fs.existsSync(dir)) return []
  const results = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, extensions))
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath)
    }
  }
  return results
}