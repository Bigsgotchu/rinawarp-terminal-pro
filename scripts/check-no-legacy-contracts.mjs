import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const routeContractPath = path.join(root, 'scripts', 'route-contract.json')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'dist-electron') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
      continue
    }
    if (!entry.isFile()) continue
    if (!/\.(ts|tsx|js|mjs|cjs|html|md)$/.test(entry.name)) continue
    out.push(full)
  }
  return out
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildLegacyRoutes() {
  const contract = readJson(routeContractPath)
  const redirects = contract?.redirects || {}
  return Array.from(
    new Set(
      Object.keys(redirects)
        .map((route) => String(route || '').trim())
        .filter(Boolean),
    ),
  )
}

function findViolations(filePath, legacyRoutes) {
  const source = fs.readFileSync(filePath, 'utf8')
  const lines = source.split('\n')
  const violations = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    for (const legacy of legacyRoutes) {
      const route = legacy.endsWith('/') ? legacy.slice(0, -1) : legacy
      if (!route || route === '/') continue
      const hrefPattern = new RegExp(`href\\s*=\\s*["'\`]${escapeRegex(route)}(?:/)?["'\`]`)
      const externalPattern = new RegExp(`openExternal\\(\\s*["'\`]https://(?:www\\.)?rinawarptech\\.com${escapeRegex(route)}(?:/)?["'\`]`)
      if (hrefPattern.test(line) || externalPattern.test(line)) {
        violations.push({
          line: i + 1,
          route,
          text: line.trim(),
        })
      }
    }
  }
  return violations
}

function main() {
  if (!fs.existsSync(routeContractPath)) {
    throw new Error(`[check-no-legacy-contracts] Missing route contract: ${routeContractPath}`)
  }
  const legacyRoutes = buildLegacyRoutes()
  const scanRoots = [
    path.join(root, 'apps', 'terminal-pro', 'src'),
    path.join(root, 'website'),
  ].filter((dir) => fs.existsSync(dir))

  const files = scanRoots.flatMap((dir) => walk(dir))
  const allViolations = []
  for (const file of files) {
    const rel = path.relative(root, file)
    const violations = findViolations(file, legacyRoutes)
    for (const violation of violations) {
      allViolations.push({ file: rel, ...violation })
    }
  }

  if (allViolations.length > 0) {
    console.error('[check-no-legacy-contracts] Legacy route references found in user-facing links:')
    for (const violation of allViolations) {
      console.error(`- ${violation.file}:${violation.line} (${violation.route}) ${violation.text}`)
    }
    process.exit(1)
  }

  console.log('[check-no-legacy-contracts] No legacy route references found in user-facing links.')
}

main()
