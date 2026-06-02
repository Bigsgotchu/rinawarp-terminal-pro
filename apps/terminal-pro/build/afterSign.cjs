const { notarize } = require('electron-notarize')

module.exports = async function afterSign(context) {
  const { electronPlatform } = context

  // Only process macOS
  if (electronPlatform !== 'darwin') {
    return
  }

  const APPLE_ID = process.env.APPLE_ID || process.env.RINAWARP_APPLE_ID
  const APPLE_ID_PASSWORD = process.env.APPLE_ID_PASSWORD || process.env.RINAWARP_APPLE_ID_PASSWORD
  const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || process.env.RINAWARP_APPLE_TEAM_ID
  const CSC_LINK = process.env.CSC_LINK || process.env.RINAWARP_CSC_LINK
  const CSC_KEY_PASSWORD = process.env.CSC_KEY_PASSWORD || process.env.RINAWARP_CSC_KEY_PASSWORD

  // Check if we have credentials for signing/notarization
  const hasNotarization = APPLE_ID && APPLE_ID_PASSWORD && APPLE_TEAM_ID
  const hasSigning = CSC_LINK && CSC_KEY_PASSWORD

  if (!hasSigning) {
    console.warn('[signing] No code signing credentials found. Skipping signing.')
    console.warn('[signing] Set CSC_LINK and CSC_KEY_PASSWORD (or RINAWARP_* equivalents) to enable signing.')
    return
  }

  if (!hasNotarization) {
    console.warn('[signing] Code signing enabled but notarization credentials missing.')
    console.warn('[signing] Set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID to enable notarization.')
    return
  }

  // Perform notarization
  console.log('[signing] Starting macOS notarization...')
  try {
    await notarize({
      appPath: context.appOutDir + '/' + context.packager.appInfo.productFilename + '.app',
      appleId: APPLE_ID,
      appleIdPassword: APPLE_ID_PASSWORD,
      teamId: APPLE_TEAM_ID,
      sta: true, // Staple notarization ticket to the app
    })
    console.log('[signing] macOS notarization completed successfully')
  } catch (error) {
    console.error('[signing] Notarization failed:', error.message)
    throw error
  }
}