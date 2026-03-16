export function toSearchTokens(input: string, maxTokens = 12): string[] {
  return String(input || '')
    .toLowerCase()
    .split(/[^a-z0-9_./:-]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, Math.max(1, Math.min(maxTokens, 500)))
}

export function boundedLevenshtein(a: string, b: string, maxDistance: number): number {
  const aa = String(a || '')
  const bb = String(b || '')
  if (aa === bb) return 0
  if (!aa || !bb) return Math.max(aa.length, bb.length)
  if (Math.abs(aa.length - bb.length) > maxDistance) return maxDistance + 1
  const prev = new Array(bb.length + 1)
  const cur = new Array(bb.length + 1)
  for (let j = 0; j <= bb.length; j += 1) prev[j] = j
  for (let i = 1; i <= aa.length; i += 1) {
    cur[0] = i
    let rowMin = cur[0]
    for (let j = 1; j <= bb.length; j += 1) {
      const cost = aa[i - 1] === bb[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      rowMin = Math.min(rowMin, cur[j])
    }
    if (rowMin > maxDistance) return maxDistance + 1
    for (let j = 0; j <= bb.length; j += 1) prev[j] = cur[j]
  }
  return prev[bb.length]
}

/**
 * Check for exact or prefix match (fast path)
 */
function checkExactOrPrefixMatch(token: string, words: string[]): number | null {
  if (words.includes(token)) return Math.min(token.length + 1.2, 10)
  for (const w of words) {
    if (!w) continue
    if (w.startsWith(token) || token.startsWith(w)) {
      return Math.max(1.8, Math.min(token.length, w.length) * 0.55)
    }
  }
  return null
}

/**
 * Find best Levenshtein distance among words
 */
function findBestLevenshtein(token: string, words: string[], maxDistance: number): number {
  let best = maxDistance + 1
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i]
    if (!w || Math.abs(w.length - token.length) > maxDistance) continue
    const d = boundedLevenshtein(token, w, maxDistance)
    if (d < best) best = d
    if (best === 1) break
  }
  return best
}

export function fuzzyTokenScore(token: string, words: string[]): number {
  const t = String(token || '')
  if (!t) return -1

  // Fast path: exact or prefix match
  const fastMatch = checkExactOrPrefixMatch(t, words)
  if (fastMatch !== null) return fastMatch

  // Slow path: fuzzy match via Levenshtein
  const maxDistance = t.length >= 8 ? 2 : 1
  const best = findBestLevenshtein(t, words, maxDistance)

  if (best > maxDistance) return -1
  return best === 1 ? Math.max(1.4, t.length * 0.42) : Math.max(1.0, t.length * 0.3)
}

export function scoreTextMatch(query: string, haystack: string): number {
  const q = String(query || '')
    .trim()
    .toLowerCase()
  if (!q) return 0.1
  const text = String(haystack || '').toLowerCase()
  if (!text) return -1
  const tokens = toSearchTokens(q, 8).slice(0, 8)
  if (!tokens.length) return -1
  const words = Array.from(new Set(toSearchTokens(text, 160))).slice(0, 140)

  let matched = 0
  let score = 0
  for (const token of tokens) {
    if (text.includes(token)) {
      matched += 1
      score += Math.min(token.length, 8) + 1.5
      continue
    }
    const fuzzy = fuzzyTokenScore(token, words)
    if (fuzzy > 0) {
      matched += 1
      score += fuzzy
    }
  }
  if (!matched) return -1
  if (text.startsWith(q)) score += 3
  if (text.includes(q)) score += 2
  if (matched === tokens.length) score += 1.5
  score += matched
  return score
}
