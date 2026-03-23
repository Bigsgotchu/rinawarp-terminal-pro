import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, IPCRequest, IPCResponse } from '../shared/contracts';

// Expose safe IPC methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Generic IPC invoke
  invoke: async <T = any, R = any>(channel: string, data?: T): Promise<IPCResponse<R>> => {
    return ipcRenderer.invoke(channel, data);
  },

  // Listener for updates from main process
  on: (channel: string, callback: (data: any) => void) => {
    ipcRenderer.on(channel, (_event, data) => callback(data));
  },

  // Remove listener
  off: (channel: string, callback: (data: any) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // Convenience methods for common operations
  runs: {
    create: (prompt: string, mode: 'local' | 'remote' = 'local') =>
      ipcRenderer.invoke(IPC_CHANNELS.RUN_CREATE, { prompt, mode }),
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.RUN_GET, { id }),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.RUN_LIST),
    cancel: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.RUN_CANCEL, { id }),
    recover: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.RUN_RECOVER, { id }),
  },

  agent: {
    status: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_STATUS),
    execute: (task: string) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_EXECUTE, { task }),
    diagnostic: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_DIAGNOSTIC),
  },

  build: {
    start: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.BUILD_START, config),
  },

  test: {
    start: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.TEST_START, config),
  },

  deploy: {
    start: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.DEPLOY_START, config),
  },

  updates: {
    check: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),
    download: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_DOWNLOAD),
    install: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL),
  },
});
