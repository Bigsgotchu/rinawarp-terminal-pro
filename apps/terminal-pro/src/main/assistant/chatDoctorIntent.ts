// @ts-nocheck

const DOCTOR_KEYWORDS = [
  'running hot',
  'overheat',
  'slow',
  'disk',
  'wifi',
  'network',
  'temperature',
  'cpu',
  'memory',
  'fan',
  'thermal',
  'disk full',
  'no space',
  'connection',
  'port',
  'service',
]

const DEV_KEYWORDS = ['build', 'compile', 'error', 'failed', 'bug', 'crash', 'debug']

const BUILDER_KEYWORDS = ['create', 'scaffold', 'project', 'setup', 'new file']

function matchesKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword))
}

export function classifyIntent(text) {
  const normalized = String(text || '').toLowerCase()

  if (matchesKeyword(normalized, DOCTOR_KEYWORDS)) {
    return { type: 'system-doctor', confidence: 0.9, intent: text }
  }

  if (matchesKeyword(normalized, DEV_KEYWORDS)) {
    return { type: 'dev-fixer', confidence: 0.7, intent: text }
  }

  if (matchesKeyword(normalized, BUILDER_KEYWORDS)) {
    return { type: 'builder', confidence: 0.6, intent: text }
  }

  return { type: 'chat', confidence: 0.5, intent: text }
}
