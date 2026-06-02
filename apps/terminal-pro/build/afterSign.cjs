module.exports = async function afterSign(context) {
  const APPLE_ID = process.env.APPLE_ID || process.env.RINAWARP_APPLE_ID
  const APPLE_ID_PASSWORD = process.env.APPLE_ID_PASSWORD || process.env.RINAWARP_APPLE_ID_PASSWORD
  const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || process.env.RINAWARP_APPLE_TEAM_ID
  const CSC_LINK = process.env.CSC_LINK || process.env.RINAWARP_CSC_LINK
  const CSC_KEY_PASSWORD = process.env.CSC_KEY_PASSWORD || process.env.RINAWARP_CSC_KEY_PASSWORD

  if (!APPLE_ID || !APPLE_ID_PASSWORD || !APPLE_TEAM_ID) {
    throw new Error(
      '[signing] macOS notarization requires APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID (or RINAWARP_* equivalents). ' +
      'Signing was not performed.'
    )
  }
  if (!CSC_LINK || !CSC_KEY_PASSWORD) {
    throw new Error(
      '[signing] Code signing requires CSC_LINK (certificate path/base64) and CSC_KEY_PASSWORD (or RINAWARP_* equivalents). ' +
      'Signing was not performed.'
    )
  }
}
