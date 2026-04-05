#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/terminal-pro"
INSTALLER_DIR="$APP_DIR/dist-electron/installer"
PUBLIC_INSTALLERS_BASE="https://pub-58c0b2f3cc8d43fa8cf6e1d4d2dcf94b.r2.dev"
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

npx wrangler r2 object put rinawarp-cdn/releases/SHASUMS256.txt --file "$INSTALLER_DIR/SHASUMS256.txt" --remote --content-type "text/plain; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "rinawarp-cdn/releases/$CHANNEL/latest.json" --file "$INSTALLER_DIR/$CHANNEL/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "rinawarp-cdn/releases/$CHANNEL/latest.yml" --file "$INSTALLER_DIR/$CHANNEL/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "rinawarp-cdn/releases/$CHANNEL/latest-linux.yml" --file "$INSTALLER_DIR/$CHANNEL/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/$CHANNEL/latest.json" --file "$TMP_DIR/$CHANNEL/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/$CHANNEL/latest.yml" --file "$TMP_DIR/$CHANNEL/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/$CHANNEL/latest-linux.yml" --file "$TMP_DIR/$CHANNEL/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml

if [[ "$CHANNEL" == "stable" ]]; then
  npx wrangler r2 object put rinawarp-cdn/releases/latest.json --file "$INSTALLER_DIR/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put rinawarp-cdn/releases/latest.yml --file "$INSTALLER_DIR/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put rinawarp-cdn/releases/latest-linux.yml --file "$INSTALLER_DIR/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put rinawarp-cdn/releases/stable/latest.json --file "$INSTALLER_DIR/stable/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put rinawarp-cdn/releases/stable/latest.yml --file "$INSTALLER_DIR/stable/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put rinawarp-cdn/releases/stable/latest-linux.yml --file "$INSTALLER_DIR/stable/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/latest.json" --file "$TMP_DIR/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/latest.yml" --file "$TMP_DIR/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/latest-linux.yml" --file "$TMP_DIR/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/stable/latest.json" --file "$TMP_DIR/stable/latest.json" --remote --content-type "application/json; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/stable/latest.yml" --file "$TMP_DIR/stable/latest.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_UPDATES_BUCKET/stable/latest-linux.yml" --file "$TMP_DIR/stable/latest-linux.yml" --remote --content-type "application/x-yaml; charset=utf-8" --cache-control "public, max-age=60, must-revalidate" --config website/wrangler.toml
fi

echo "[publish:update-metadata] Uploaded $CHANNEL update metadata to R2"
