import { IpcMain } from 'electron';
import { AgentOrchestrator } from '../agentd/orchestrator';
import { DataStore } from '../store/datastore';
import { IPC_CHANNELS, IPCResponse } from '../../shared/contracts';
import { autoUpdater } from 'electron-updater';

export function setupIPCHandlers(
  ipcMain: IpcMain,
  orchestrator: AgentOrchestrator,
  dataStore: DataStore
) {
  // Run management
  ipcMain.handle(IPC_CHANNELS.RUN_CREATE, async (_event, data) => {
    try {
      const run = await orchestrator.createRun(data.prompt, data.mode);
      return { success: true, data: run } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.RUN_GET, async (_event, data) => {
    try {
      const run = await orchestrator.getRun(data.id);
      return { success: true, data: run } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.RUN_LIST, async () => {
    try {
      const runs = await orchestrator.listRuns();
      return { success: true, data: runs } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.RUN_CANCEL, async (_event, data) => {
    try {
      const success = await orchestrator.cancelRun(data.id);
      return { success, data: success } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.RUN_RECOVER, async (_event, data) => {
    try {
      const run = await orchestrator.recoverRun(data.id);
      return { success: true, data: run } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  // Agent operations
  ipcMain.handle(IPC_CHANNELS.AGENT_STATUS, async () => {
    try {
      const status = orchestrator.getAgentStatus();
      return { success: true, data: status } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_EXECUTE, async (_event, data) => {
    try {
      const run = await orchestrator.createRun(data.task, 'local');
      return { success: true, data: run } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_DIAGNOSTIC, async () => {
    try {
      const diagnostic = await orchestrator.diagnostic();
      return { success: true, data: diagnostic } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  // Receipt operations
  ipcMain.handle(IPC_CHANNELS.RECEIPT_GET, async (_event, data) => {
    try {
      const receipts = await dataStore.getReceipts(data.runId);
      return { success: true, data: receipts } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  // Build/Test/Deploy (placeholder implementations)
  ipcMain.handle(IPC_CHANNELS.BUILD_START, async (_event, config) => {
    try {
      const run = await orchestrator.createRun(`Build: ${JSON.stringify(config)}`, 'local');
      return { success: true, data: run } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TEST_START, async (_event, config) => {
    try {
      const run = await orchestrator.createRun(`Test: ${JSON.stringify(config)}`, 'local');
      return { success: true, data: run } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEPLOY_START, async (_event, config) => {
    try {
      const run = await orchestrator.createRun(`Deploy: ${JSON.stringify(config)}`, 'local');
      return { success: true, data: run } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  // Update operations
  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, data: result } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, async () => {
    try {
      autoUpdater.quitAndInstall();
      return { success: true } as IPCResponse;
    } catch (error: any) {
      return { success: false, error: error.message } as IPCResponse;
    }
  });

  console.log('[IPC] All handlers registered');
}
