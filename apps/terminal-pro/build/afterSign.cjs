/* eslint-disable no-console */
const path = require("node:path");

exports.default = async function afterSign(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appOutDir = context.appOutDir;
  const appName = context.packager.appInfo.productFilename;

  const appleId = process.env.APPLE_ID;
  const applePassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !applePassword || !teamId) {
    console.log("[notarize] Skipping: APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not set");
    return;
  }

  const appPath = path.join(appOutDir, `${appName}.app`);
  console.log(`[notarize] Notarizing: ${appPath}`);

  const { notarize } = require("@electron/notarize");

  await notarize({
    appPath,
    appleId,
    appleIdPassword: applePassword,
    teamId,
  });

  console.log("[notarize] Done");
};
