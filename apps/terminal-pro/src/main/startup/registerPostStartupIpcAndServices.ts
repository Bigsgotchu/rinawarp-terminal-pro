// @ts-nocheck
import type { RegisterPostStartupIpcAndServicesDeps } from './runtimeTypes.js'

export function registerPostStartupIpcAndServices(
    deps: RegisterPostStartupIpcAndServicesDeps
) {
    const {
        registerPtyHandlers,
        registerAgentExecutionIpc,
        agentExecutionIpcDeps,
        registerAnalyticsIpc,
        analyticsIpcDeps,
        registerRinaPlanIpc,
        rinaPlanIpcDeps,
        registerRinaIpc,
        rinaIpcDeps,
        registerTeamIpc,
        teamIpcDeps,
        registerThemeHandlers,
        ipcMain,
        themeRegistryDeps,
        registerMemoryIpc,
        memoryIpcDeps,
        registerUpdateIpc,
        updateIpcDeps,
    } = deps;
    registerPtyHandlers();
    registerAgentExecutionIpc(agentExecutionIpcDeps);
    registerAnalyticsIpc(analyticsIpcDeps);
    registerRinaPlanIpc(rinaPlanIpcDeps);
    registerRinaIpc(rinaIpcDeps);
    registerTeamIpc(teamIpcDeps);
    registerThemeHandlers(ipcMain, themeRegistryDeps);
    registerMemoryIpc(memoryIpcDeps);
    registerUpdateIpc(updateIpcDeps);
}
