import crypto from "node:crypto";
import path from "node:path";
import { app, dialog } from "electron";

export function createSupportBundleSaveDialog(args: { isE2E: boolean }) {
  return async function showSaveDialogForBundle(defaultPath: string) {
    if (args.isE2E) {
      return {
        canceled: false,
        filePath: path.join(
          app.getPath("temp"),
          `rinawarp-support-bundle-e2e-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.zip`,
        ),
      };
    }
    return dialog.showSaveDialog({
      title: "Save Support Bundle",
      defaultPath,
      filters: [{ name: "Zip", extensions: ["zip"] }],
    });
  };
}
