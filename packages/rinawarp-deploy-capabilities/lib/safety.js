const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const diffParser = require('./diff-parser')

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function fileHashSync(filePath) {
  const buf = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function snapshotFilesSync(paths) {
  const out = {}
  for (const p of paths) {
    try {
      const stat = fs.statSync(p)
      out[p] = { mtimeMs: stat.mtimeMs, size: stat.size, hash: fileHashSync(p) }
    } catch (err) {
      out[p] = { missing: true }
    }
  }
  return out
}

function createBackupSync(filePath, backupDir) {
  ensureDirExists(backupDir)
  const base = path.basename(filePath)
  const ts = Date.now()
  const rand = crypto.randomBytes(4).toString('hex')
  const backupName = `${base}.${ts}.${rand}.bak`
  const dest = path.join(backupDir, backupName)
  fs.copyFileSync(filePath, dest)
  return dest
}

function listBackupsSync(backupDir, forFileBase) {
  if (!fs.existsSync(backupDir)) return []
  return fs.readdirSync(backupDir).filter((n) => n.startsWith(forFileBase))
}

function verifyBackupMatchesSync(filePath, backupPath) {
  if (!fs.existsSync(filePath) || !fs.existsSync(backupPath)) return false
  const a = fs.readFileSync(filePath)
  const b = fs.readFileSync(backupPath)
  return a.equals(b)
}

function parseUnifiedDiff(diffText) {
  // Very small sanity parser: ensures file headers exist and hunks start with @@
  const lines = diffText.split(/\r?\n/)
  const fileHeaderIdx = lines.findIndex((l) => l.startsWith('+++ ') || l.startsWith('--- '))
  if (fileHeaderIdx === -1) throw new Error('Invalid diff: missing file header')
  const hunkLine = lines.find((l) => l.startsWith('@@ '))
  if (!hunkLine) throw new Error('Invalid diff: missing hunk')
  return { ok: true }
}

function normalizeDiffPath(filePath) {
  return String(filePath || '').replace(/^[ab]\//, '')
}

function applyFilePatch(fileEntry, repoRoot) {
  const targetPath = normalizeDiffPath(fileEntry.newFile || fileEntry.oldFile)
  const abs = path.join(repoRoot, targetPath)
  if (!fs.existsSync(abs)) throw new Error(`Patch target is missing: ${targetPath}`)

  const original = fs.readFileSync(abs, 'utf8').split(/\r?\n/)
  const output = []
  let cursor = 0

  for (const hunk of fileEntry.hunks) {
    const startIdx = Math.max(0, hunk.oldStart - 1)
    while (cursor < startIdx) output.push(original[cursor++])

    for (const line of hunk.lines) {
      if (line.type === ' ' || line.type === '-') {
        if (original[cursor] !== line.content) {
          throw new Error(`Patch context mismatch in ${targetPath}`)
        }
        if (line.type === ' ') output.push(original[cursor])
        cursor += 1
      } else if (line.type === '+') {
        output.push(line.content)
      } else if (line.type === '\\') {
        // Unified-diff marker such as "\\ No newline at end of file".
      } else {
        throw new Error(`Unsupported diff line type: ${line.type}`)
      }
    }
  }

  while (cursor < original.length) output.push(original[cursor++])
  fs.writeFileSync(abs, output.join('\n'), 'utf8')
}

async function applyPatchReplay(diffText, options = {}) {
  const repoRoot = options.repoRoot
  if (!repoRoot) throw new Error('applyPatchReplay requires repoRoot for shell-free replay')

  const parsed = diffParser.parseUnifiedDiff(diffText)
  for (const fileEntry of parsed.files) {
    if (!diffParser.validatePreimageMatchesFilesystem(fileEntry, repoRoot)) {
      throw new Error('Patch preimage does not match filesystem')
    }
  }
  for (const fileEntry of parsed.files) {
    applyFilePatch(fileEntry, repoRoot)
  }
  return { ok: true, repoRoot, files: parsed.files.length }
}

module.exports = {
  ensureDirExists,
  fileHashSync,
  snapshotFilesSync,
  createBackupSync,
  listBackupsSync,
  verifyBackupMatchesSync,
  parseUnifiedDiff,
  applyPatchReplay,
}
