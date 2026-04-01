// @ts-nocheck

function normalizeErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

export async function requestWithFallback(agentdJson, path, options, fallback) {
  try {
    return await agentdJson(path, options)
  } catch (error) {
    return fallback(normalizeErrorMessage(error))
  }
}

export function buildQueryString(params) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === false || value === '') {
      continue
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue
      query.set(key, String(value))
      continue
    }

    query.set(key, value === true ? '1' : String(value))
  }

  const suffix = query.toString()
  return suffix ? `?${suffix}` : ''
}

export function createIdempotencyKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function encodePathParam(value) {
  return encodeURIComponent(String(value || '').trim())
}
