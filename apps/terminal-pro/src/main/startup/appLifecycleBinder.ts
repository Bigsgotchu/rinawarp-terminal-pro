// @ts-nocheck

export function bindAppLifecycle(deps) {
    const {
        app,
        BrowserWindow,
        createWindow,
        ptySessions,
        closePtyForWebContents,
        platform,
    } = deps;
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
    app.on('before-quit', () => {
        for (const id of ptySessions.keys()) {
            closePtyForWebContents(id);
        }
    });
    app.on('window-all-closed', () => {
        if (platform !== 'darwin') {
            app.quit();
        }
    });
}
