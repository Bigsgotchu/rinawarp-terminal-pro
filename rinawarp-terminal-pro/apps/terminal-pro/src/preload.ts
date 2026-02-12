import { contextBridge, ipcRenderer, shell } from "electron";

contextBridge.exposeInMainWorld("rina", {
  // Original APIs
  plan: (intent: string) => ipcRenderer.invoke("agent:plan", intent),
  execute: () => ipcRenderer.invoke("agent:execute"),
  verifyLicense: (customerId: string) => ipcRenderer.invoke("license:verify", customerId),

  // Directory picker
  showDirectoryPicker: () => ipcRenderer.invoke("rina:pickDirectory"),

  // Workspace picker (returns { ok, path })
  pickWorkspace: () => ipcRenderer.invoke("rina:workspace:pick"),

  // Warp-like block APIs
  agentPlan: (args: { intentText: string; projectRoot: string }) =>
    ipcRenderer.invoke("rina:agent:plan", args),

  executePlanStream: (args: {
    plan: any[];
    projectRoot: string;
    confirmed: boolean;
    confirmationText: string;
  }) => ipcRenderer.invoke("rina:executePlanStream", args),

  // Plan stop API
  stopPlan: (planRunId: string) => ipcRenderer.invoke("rina:plan:stop", planRunId),

  // Doctor v1: Read-only evidence collection
  doctorPlan: (args: { projectRoot: string; symptom: string }) =>
    ipcRenderer.invoke("rina:doctor:plan", args),

  executeStepStream: (args: {
    step: { id: string; tool: "terminal"; command: string; risk: "read" | "safe-write" | "high-impact" };
    projectRoot: string;
    confirmed: boolean;
    confirmationText: string;
  }) =>
    ipcRenderer.invoke("rina:executeStepStream", args.step, args.confirmed, args.confirmationText, args.projectRoot),

  cancelStream: (streamId: string) => ipcRenderer.invoke("rina:stream:cancel", streamId),

  onStreamChunk: (cb: (evt: any) => void) => ipcRenderer.on("rina:stream:chunk", (_e, payload) => cb(payload)),
  onStreamEnd: (cb: (evt: any) => void) => ipcRenderer.on("rina:stream:end", (_e, payload) => cb(payload)),
  onPlanStepStart: (cb: (evt: any) => void) => ipcRenderer.on("rina:plan:stepStart", (_e, payload) => cb(payload)),

  // Plan run events
  onPlanRunStart: (cb: (p: { planRunId: string }) => void) =>
    ipcRenderer.on("rina:plan:run:start", (_e, p) => cb(p)),
  onPlanRunEnd: (cb: (p: { planRunId: string; ok: boolean; haltedBecause?: string }) => void) =>
    ipcRenderer.on("rina:plan:run:end", (_e, p) => cb(p)),

  // Generic custom event handler
  onCustomEvent: (eventName: string, cb: (evt: any) => void) => ipcRenderer.on(eventName, (_e, payload) => cb(payload)),
});
