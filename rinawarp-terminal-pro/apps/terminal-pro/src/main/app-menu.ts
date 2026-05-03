import { Menu, type BrowserWindow } from "electron";

export function installAppContextMenu(win: BrowserWindow) {
  const contextMenu = Menu.buildFromTemplate([
    { role: "undo" },
    { role: "redo" },
    { type: "separator" },
    { role: "cut" },
    { role: "copy" },
    { role: "paste" },
    { role: "selectAll" },
  ]);

  win.webContents.on("context-menu", () => {
    contextMenu.popup({ window: win });
  });
}
