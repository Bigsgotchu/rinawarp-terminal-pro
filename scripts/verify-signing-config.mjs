#!/usr/bin/env node
/**
 * Verify signing configuration for desktop builds
 * Checks that required environment variables are set for code signing
 */

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset)
}

function check(name, value, required = true) {
  if (value) {
    log(`✅ ${name}: configured`, 'green')
    return true
  } else if (required) {
    log(`❌ ${name}: NOT SET (required for signing)`, 'red')
    return false
  } else {
    log(`⚠️  ${name}: NOT SET (optional)`, 'yellow')
    return true
  }
}

function main() {
  const isCI = process.env.CI === 'true'

  log('\n📋 Signing Configuration Check\n', 'bold')

  // macOS signing
  log('macOS:', 'bold')
  const macSigning = check(
    'CSC_LINK (certificate)',
    process.env.CSC_LINK || process.env.RINAWARP_CSC_LINK,
    false
  )
  const macKeyPassword = check(
    'CSC_KEY_PASSWORD',
    process.env.CSC_KEY_PASSWORD || process.env.RINAWARP_CSC_KEY_PASSWORD,
    false
  )
  const macNotarization = check(
    'APPLE_ID',
    process.env.APPLE_ID || process.env.RINAWARP_APPLE_ID,
    false
  )
  check(
    'APPLE_ID_PASSWORD',
    process.env.APPLE_ID_PASSWORD || process.env.RINAWARP_APPLE_ID_PASSWORD,
    false
  )
  check(
    'APPLE_TEAM_ID',
    process.env.APPLE_TEAM_ID || process.env.RINAWARP_APPLE_TEAM_ID,
    false
  )

  const macSignReady = macSigning && macKeyPassword
  const macNotarizeReady = macNotarization && macKeyPassword && process.env.APPLE_ID_PASSWORD

  log(`\n📱 macOS signing: ${macSignReady ? 'READY' : 'NOT CONFIGURED'}`, macSignReady ? 'green' : 'yellow')
  log(`📱 macOS notarization: ${macNotarizeReady ? 'READY' : 'NOT CONFIGURED'}`, macNotarizeReady ? 'green' : 'yellow')

  // Windows signing
  log('\nWindows:', 'bold')
  const winSigning = check(
    'CSC_LINK (certificate)',
    process.env.CSC_LINK || process.env.RINAWARP_CSC_LINK,
    false
  )
  const winKeyPassword = check(
    'CSC_KEY_PASSWORD',
    process.env.CSC_KEY_PASSWORD || process.env.RINAWARP_CSC_KEY_PASSWORD,
    false
  )

  const winSignReady = winSigning && winKeyPassword
  log(`\n🪟 Windows signing: ${winSignReady ? 'READY' : 'NOT CONFIGURED'}`, winSignReady ? 'green' : 'yellow')

  // Summary
  log('\n📊 Summary:', 'bold')
  if (macSignReady || winSignReady) {
    log('✅ Code signing is configured', 'green')
    if (!macSignReady) {
      log('   - macOS: not configured (set CSC_LINK and CSC_KEY_PASSWORD)', 'yellow')
    }
    if (!winSignReady) {
      log('   - Windows: not configured (set CSC_LINK and CSC_KEY_PASSWORD)', 'yellow')
    }
  } else {
    log('⚠️  Code signing not configured - builds will be unsigned', 'yellow')
    log('   Set CSC_LINK and CSC_KEY_PASSWORD for signing', 'yellow')
  }

  log('\n📚 See docs/SIGNING.md for setup instructions\n', 'yellow')

  // Exit with error only if required signing is missing in CI
  if (isCI && process.env.REQUIRE_SIGNING === 'true') {
    if (!macSignReady && !winSignReady) {
      log('❌ Signing required in CI but not configured', 'red')
      process.exit(1)
    }
  }

  process.exit(0)
}

main()