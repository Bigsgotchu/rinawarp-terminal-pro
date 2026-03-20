/**
 * RinaWarp Doctor - Auto-fix Project
 *
 * Runs diagnostics and automatically fixes common issues.
 */

import { execCommand } from './execution/legacyShell.js'

/**
 * Run a diagnostic command
 */
async function runCommand(cmd: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const { stdout, stderr } = await execCommand(cmd, { timeout: 30000 })
    return { success: true, output: stdout || stderr }
  } catch (error: any) {
    return { success: false, output: error.stdout || '', error: error.message }
  }
}

/**
 * Run diagnostics and auto-fix
 */
export async function runDoctor(): Promise<string> {
  const fixes: string[] = []
  const results: string[] = []

  results.push('🔍 RinaWarp Doctor - Running diagnostics...\n')

  // 1. Check npm/node
  results.push('\n📦 Checking Node.js environment...')
  const nodeCheck = await runCommand('node --version')
  if (nodeCheck.success) {
    results.push(`  ✓ Node.js: ${nodeCheck.output.trim()}`)
  } else {
    results.push('  ✗ Node.js not found')
    fixes.push('Install Node.js: https://nodejs.org')
  }

  const npmCheck = await runCommand('npm --version')
  if (npmCheck.success) {
    results.push(`  ✓ npm: ${npmCheck.output.trim()}`)
  }

  // 2. Check for node_modules
  results.push('\n📁 Checking project dependencies...')
  const nodeModulesCheck = await runCommand('test -d node_modules && echo "exists" || echo "missing"')
  if (nodeModulesCheck.output.includes('missing')) {
    results.push('  ⚠ node_modules not found')
    fixes.push('Run: npm install')
  } else {
    results.push('  ✓ node_modules exists')
  }

  // 3. Check Git status
  results.push('\n🔧 Checking Git status...')
  const gitCheck = await runCommand('git status --porcelain 2>/dev/null || echo "not-git"')
  if (!gitCheck.output.includes('not-git') && gitCheck.output.trim()) {
    results.push('  ⚠ Uncommitted changes detected')
    const untracked = await runCommand('git status --porcelain 2>/dev/null | grep "^??" | wc -l')
    if (parseInt(untracked.output) > 0) {
      fixes.push('Consider committing: git add . && git commit')
    }
  } else {
    results.push('  ✓ Git repository clean')
  }

  // 4. Check Docker
  results.push('\n🐳 Checking Docker...')
  const dockerCheck = await runCommand('docker --version')
  if (dockerCheck.success) {
    results.push(`  ✓ Docker: ${dockerCheck.output.trim()}`)

    // Check if Docker is running
    const dockerPs = await runCommand('docker ps 2>&1')
    if (dockerPs.success) {
      results.push('  ✓ Docker daemon running')
    } else {
      results.push('  ✗ Docker daemon not running')
      fixes.push('Start Docker: sudo systemctl start docker')
    }
  } else {
    results.push('  ✗ Docker not installed')
  }

  // 5. Check for package.json issues
  results.push('\n📋 Checking package.json...')
  const pkgJsonCheck = await runCommand('test -f package.json && echo "exists" || echo "missing"')
  if (pkgJsonCheck.output.includes('exists')) {
    results.push('  ✓ package.json found')
  } else {
    results.push('  ✗ No package.json found')
  }

  // Summary
  results.push('\n' + '='.repeat(50))

  if (fixes.length > 0) {
    results.push('\n🔧 Suggested Fixes:')
    fixes.forEach((fix, i) => {
      results.push(`  ${i + 1}. ${fix}`)
    })
    results.push('\nRun suggested fixes? Use: rina doctor --fix')
  } else {
    results.push('\n✅ No issues found! Your project looks good.')
  }

  results.push('\n' + '='.repeat(50))
  results.push('\nFor more help, visit: https://rinawarptech.com/docs')

  return results.join('\n')
}

/**
 * Auto-fix issues
 */
export async function runDoctorFix(): Promise<string> {
  const fixes: string[] = []
  const results: string[] = []

  results.push('🔧 RinaWarp Doctor - Auto-fixing issues...\n')

  // Fix 1: npm install if node_modules missing
  results.push('📦 Running npm install...')
  const npmInstall = await runCommand('npm install --prefer-offline 2>&1')
  if (npmInstall.success) {
    results.push('  ✓ Dependencies installed')
    fixes.push('npm install')
  } else {
    results.push(`  ⚠ npm install had issues: ${npmInstall.error?.slice(0, 100)}`)
  }

  // Fix 2: Docker cleanup
  results.push('\n🐳 Running Docker cleanup...')
  const dockerPrune = await runCommand('docker system prune -f 2>&1')
  if (dockerPrune.success) {
    results.push('  ✓ Docker cleaned')
  }

  // Summary
  results.push('\n' + '='.repeat(50))
  results.push('\n✅ Auto-fix complete!')
  results.push('\nIf you still have issues, try: rina install docker-repair')

  return results.join('\n')
}
