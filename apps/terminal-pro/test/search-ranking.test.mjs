import test from 'node:test'
import assert from 'node:assert/strict'

const { scoreTextMatch } = await import('../dist-electron/search-ranking.js')

test('returns positive score for exact phrase match', () => {
  const score = scoreTextMatch('terraform plan', 'run terraform plan before apply')
  assert.ok(score > 0)
})

test('supports fuzzy typo matching', () => {
  const score = scoreTextMatch('terrafrom aplly', 'terraform apply -auto-approve')
  assert.ok(score > 0)
})

test('matches tokens beyond first 12 haystack tokens', () => {
  const haystack = [
    'alpha',
    'bravo',
    'charlie',
    'delta',
    'echo',
    'foxtrot',
    'golf',
    'hotel',
    'india',
    'juliet',
    'kilo',
    'lima',
    'terraform',
    'apply',
  ].join(' ')
  const score = scoreTextMatch('terraform apply', haystack)
  assert.ok(score > 0)
})

test('returns -1 when no tokens match', () => {
  const score = scoreTextMatch('kubernetes', 'terraform apply now')
  assert.equal(score, -1)
})
