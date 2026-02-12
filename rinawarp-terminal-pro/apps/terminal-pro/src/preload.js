import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("rina", {
    // Original APIs
    plan: (intent) => ipcRenderer.invoke("agent:plan", intent),
    execute: () => ipcRenderer.invoke("agent:execute"),
    verifyLicense: (customerId) => ipcRenderer.invoke("license:verify", customerId),
    // Directory picker
    showDirectoryPicker: () => ipcRenderer.invoke("rina:pickDirectory"),
    // Workspace picker (returns { ok, path })
    pickWorkspace: () => ipcRenderer.invoke("rina:workspace:pick"),
    // Warp-like block APIs
    agentPlan: (args) => ipcRenderer.invoke("rina:agent:plan", args),
    executePlanStream: (args) => ipcRenderer.invoke("rina:executePlanStream", args),
    // Plan stop API
    stopPlan: (planRunId) => ipcRenderer.invoke("rina:plan:stop", planRunId),
    // Doctor v1: Read-only evidence collection
    doctorPlan: (args) => ipcRenderer.invoke("rina:doctor:plan", args),
    executeStepStream: (args) => ipcRenderer.invoke("rina:executeStepStream", args.step, args.confirmed, args.confirmationText, args.projectRoot),
    cancelStream: (streamId) => ipcRenderer.invoke("rina:stream:cancel", streamId),
    onStreamChunk: (cb) => ipcRenderer.on("rina:stream:chunk", (_e, payload) => cb(payload)),
    onStreamEnd: (cb) => ipcRenderer.on("rina:stream:end", (_e, payload) => cb(payload)),
    onPlanStepStart: (cb) => ipcRenderer.on("rina:plan:stepStart", (_e, payload) => cb(payload)),
    // Plan run events
    onPlanRunStart: (cb) => ipcRenderer.on("rina:plan:run:start", (_e, p) => cb(p)),
    onPlanRunEnd: (cb) => ipcRenderer.on("rina:plan:run:end", (_e, p) => cb(p)),
    // Generic custom event handler
    onCustomEvent: (eventName, cb) => ipcRenderer.on(eventName, (_e, payload) => cb(payload)),
});
