#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/terminal-pro"
INSTALLER_DIR="$APP_DIR/dist-electron/installer"
PUBLIC_INSTALLERS_BASE="https://pub-58c0b2f3cc8d43fa8cf6e1d4d2dcf94b.r2.dev"
PUBLIC_UPDATES_BASE="https://pub-4df343f1b4524762a4f8ad3c744653c9.r2.dev"
PUBLIC_UPDATES_BUCKET="rinawarp-updates"
TMP_DIR="$(mktemp -d)"
VERSION="$(node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('$APP_DIR/package.json','utf8')); process.stdout.write(pkg.version)")"
CHANNEL="$(node -e "const version=process.argv[1]; process.stdout.write(/-alpha\\./.test(version) ? 'alpha' : /-beta\\./.test(version) ? 'beta' : 'stable')" "$VERSION")"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cd "$ROOT_DIR"

corepack pnpm --filter rinawarp-terminal-pro exec node scripts/generate-update-metadata.mjs

if [[ "$CHANNEL" == "stable" ]]; then
  curl -fsSL "$PUBLIC_UPDATES_BASE/latest.json" -o "$TMP_DIR/previous-latest.json" || true
  curl -fsSL "$PUBLIC_UPDATES_BASE/latest.yml" -o "$TMP_DIR/previous-latest.yml" || true
  curl -fsSL "$PUBLIC_INSTALLERS_BASE/releases/SHASUMS256.txt" -o "$TMP_DIR/previous-SHASUMS256.txt" || true
fi

INSTALLER_DIR="$INSTALLER_DIR" TMP_DIR="$TMP_DIR" CHANNEL="$CHANNEL" node <<'EOF'
const fs = require('fs')
const path = require('path')

const installerDir = process.env.INSTALLER_DIR
const tmpDir = process.env.TMP_DIR
const channel = process.env.CHANNEL

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath, 'utf8')
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function writeJson(filePath, value) {
  ensureDir(filePath)
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

function writeText(filePath, value) {
  ensureDir(filePath)
  fs.writeFileSync(filePath, value)
}

const currentLatest = readJson(path.join(installerDir, 'latest.json'))
const currentStableLatest = readJson(path.join(installerDir, channel, 'latest.json'))
const currentChecksums = readText(path.join(installerDir, 'SHASUMS256.txt'))
const currentLatestYml = readText(path.join(installerDir, 'latest.yml'))
const currentStableLatestYml = readText(path.join(installerDir, channel, 'latest.yml'))

if (channel !== 'stable' || !currentLatest || !currentStableLatest || !currentChecksums || !currentLatestYml || !currentStableLatestYml) {
  process.exit(0)
}

const previousLatest = readJson(path.join(tmpDir, 'previous-latest.json'))
const previousLatestYml = readText(path.join(tmpDir, 'previous-latest.yml'))
const previousChecksums = readText(path.join(tmpDir, 'previous-SHASUMS256.txt'))

const preservedKinds = []
const mergeLatest = (target) => {
  const merged = structuredClone(target)
  for (const kind of ['deb', 'windows']) {
    if (!merged?.files?.[kind] && previousLatest?.files?.[kind]) {
      merged.files[kind] = previousLatest.files[kind]
      preservedKinds.push(kind)
    }
  }
  return merged
}

const mergedLatest = mergeLatest(currentLatest)
const mergedStableLatest = mergeLatest(currentStableLatest)

writeJson(path.join(tmpDir, 'latest.json'), mergedLatest)
writeJson(path.join(tmpDir, 'stable', 'latest.json'), mergedStableLatest)

const currentChecksumLines = new Map(
  currentChecksums
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s{2,}/)
      return [parts[1], line]
    })
)

if (previousChecksums) {
  for (const line of previousChecksums.split('\n').map((entry) => entry.trim()).filter(Boolean)) {
    const parts = line.split(/\s{2,}/)
    const fileName = parts[1]
    const shouldPreserve = preservedKinds.some((kind) => mergedLatest?.files?.[kind]?.name === fileName)
    if (shouldPreserve && !currentChecksumLines.has(fileName)) {
      currentChecksumLines.set(fileName, line)
    }
  }
}

writeText(path.join(tmpDir, 'SHASUMS256.txt'), `${Array.from(currentChecksumLines.values()).join('\n')}\n`)

const usePreviousWindowsYml = preservedKinds.includes('windows') && previousLatestYml
writeText(path.join(tmpDir, 'latest.yml'), usePreviousWindowsYml ? previousLatestYml : currentLatestYml)
writeText(path.join(tmpDir, 'stable', 'latest.yml'), usePreviousWindowsYml ? previousLatestYml : currentStableLatestYml)
EOF

PUBLIC_INSTALLERS_BASE="$PUBLIC_INSTALLERS_BASE" INSTALLER_DIR="$INSTALLER_DIR" TMP_DIR="$TMP_DIR" CHANNEL="$CHANNEL" node <<'EOF'
const fs = require('fs')
const path = require('path')

const installerDir = process.env.INSTALLER_DIR
const tmpDir = process.env.TMP_DIR
const installersBase = process.env.PUBLIC_INSTALLERS_BASE.replace(/\/+$/, '')
const channel = process.env.CHANNEL || 'stable'

function rewriteJson(relativePath) {
  const source = path.join(installerDir, relativePath)
  const target = path.join(tmpDir, relativePath)
  const parsed = JSON.parse(fs.readFileSync(source, 'utf8'))
  if (parsed?.files) {
    for (const entry of Object.values(parsed.files)) {
      if (entry && typeof entry === 'object' && typeof entry.path === 'string') {
        entry.url = `${installersBase}/${entry.path.replace(/^\/+/, '')}`
      }
    }
  }
  if (parsed?.platforms) {
    for (const entry of Object.values(parsed.platforms)) {
      if (entry && typeof entry === 'object' && typeof entry.url === 'string') {
        entry.url = `${installersBase}/${entry.url.replace(/^\/+/, '')}`
      }
    }
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, JSON.stringify(parsed, null, 2))
}

function rewriteYml(relativePath) {
  const source = path.join(installerDir, relativePath)
  const target = path.join(tmpDir, relativePath)
  const contents = fs.readFileSync(source, 'utf8')
  const versionMatch = contents.match(/^version:\s+(.+)$/m)
  const version = versionMatch ? String(versionMatch[1]).trim() : ''
  const normalizeUrl = (value) => {
    const trimmed = String(value).trim()
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    const normalized = trimmed.replace(/^\/+/, '')
    if (normalized.startsWith('releases/')) return normalized
    if (version) return `releases/${version}/${normalized}`
    return normalized
  }
  const rewritten = contents.replace(
    /^(\s*-\s+url:\s+)(.+)$/m,
    (_match, prefix, url) => `${prefix}${installersBase}/${normalizeUrl(url)}`
  ).replace(
    /^(path:\s+)(.+)$/m,
    (_match, prefix, url) => `${prefix}${installersBase}/${normalizeUrl(url)}`
  )
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, rewritten)
}

rewriteJson(path.join(channel, 'latest.json'))
rewriteYml(path.join(channel, 'latest.yml'))
rewriteYml(path.join(channel, 'latest-linux.yml'))
if (channel === 'stable') {
  rewriteJson('latest.json')
  rewriteJson(path.join('stable', 'latest.json'))
  rewriteYml('latest.yml')
  rewriteYml('latest-linux.yml')
  rewriteYml(path.join('stable', 'latest.yml'))
  rewriteYml(path.join('stable', 'latest-linux.yml'))
}
EOF

npx wrangler r2 object put rinawarp-cdn/releases/SHASUMS256.txt --file "${TMP_DIR}/SHASUMS256.txt" --remote --content-type "text/plain; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "rinawarp-cdn/releases/$CHANNEL/latest.json" --file "${TMP_DIR}/$CHANNEL/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "rinawarp-cdn/releases/$CHANNEL/latest.yml" --file "${TMP_DIR}/$CHANNEL/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "rinawarp-cdn/releases/$CHANNEL/latest-linux.yml" --file "$INSTALLER_DIR/$CHANNEL/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/$CHANNEL/latest.json" --file "$TMP_DIR/$CHANNEL/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/$CHANNEL/latest.yml" --file "$TMP_DIR/$CHANNEL/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/$CHANNEL/latest-linux.yml" --file "$TMP_DIR/$CHANNEL/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml

if [[ "$CHANNEL" == "stable" ]]; then
  npx wrangler r2 object put rinawarp-cdn/releases/latest.json --file "$TMP_DIR/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put rinawarp-cdn/releases/latest.yml --file "$TMP_DIR/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put rinawarp-cdn/releases/latest-linux.yml --file "$INSTALLER_DIR/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put rinawarp-cdn/releases/stable/latest.json --file "$TMP_DIR/stable/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put rinawarp-cdn/releases/stable/latest.yml --file "$TMP_DIR/stable/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put rinawarp-cdn/releases/stable/latest-linux.yml --file "$INSTALLER_DIR/stable/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/latest.json" --file "$TMP_DIR/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/latest.yml" --file "$TMP_DIR/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/latest-linux.yml" --file "$TMP_DIR/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/stable/latest.json" --file "$TMP_DIR/stable/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/stable/latest.yml" --file "$TMP_DIR/stable/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/stable/latest-linux.yml" --file "$TMP_DIR/stable/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
fi

echo "[publish:update-metadata] Uploaded $CHANNEL update metadata to R2"
