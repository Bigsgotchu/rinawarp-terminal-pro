const fs = require('fs')

function parseUnifiedDiff(diffText) {
  const lines = diffText.split(/\r?\n/)
  const files = []
  let i = 0
  while (i < lines.length) {
    // find --- old file
    if (!lines[i].startsWith('--- ')) {
      i += 1
      continue
    }
    const oldFileLine = lines[i++]
    const newFileLine = lines[i] && lines[i].startsWith('+++ ') ? lines[i++] : null
    const oldFile = oldFileLine.replace(/^---\s+/, '').split('\t')[0]
    const newFile = newFileLine ? newFileLine.replace(/^\+\+\+\s+/, '').split('\t')[0] : null

    const fileEntry = { oldFile, newFile, hunks: [] }

    while (i < lines.length && lines[i].startsWith('@@ ')) {
      const header = lines[i++]
      const m = header.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/)
      if (!m) throw new Error('Invalid hunk header: ' + header)
      const oldStart = parseInt(m[1], 10)
      const oldCount = parseInt(m[2] || '1', 10)
      const newStart = parseInt(m[3], 10)
      const newCount = parseInt(m[4] || '1', 10)
      const hunkLines = []
      while (i < lines.length && /^[ +-\\]/.test(lines[i])) {
        const line = lines[i++]
        const type = line[0]
        const content = line.slice(1)
        hunkLines.push({ type, content })
      }

      fileEntry.hunks.push({ oldStart, oldCount, newStart, newCount, lines: hunkLines })
    }

    files.push(fileEntry)
  }

  if (files.length === 0) throw new Error('No file diffs found')
  return { files }
}

function validatePreimageMatchesFilesystem(fileEntry, repoRoot) {
  // For each hunk, collect expected old lines (context + removals) and compare
  for (const hunk of fileEntry.hunks) {
    const expected = []
    for (const l of hunk.lines) {
      if (l.type === ' ' || l.type === '-') expected.push(l.content)
    }
    const filePath = fileEntry.oldFile.replace('a/', '').replace('b/', '')
    const abs = require('path').join(repoRoot || process.cwd(), filePath)
    if (!fs.existsSync(abs)) return false
    const actualLines = fs.readFileSync(abs, 'utf8').split(/\r?\n/)
    const startIdx = Math.max(0, hunk.oldStart - 1)
    const slice = actualLines.slice(startIdx, startIdx + expected.length)
    if (slice.join('\n') !== expected.join('\n')) return false
  }
  return true
}

module.exports = { parseUnifiedDiff, validatePreimageMatchesFilesystem }
