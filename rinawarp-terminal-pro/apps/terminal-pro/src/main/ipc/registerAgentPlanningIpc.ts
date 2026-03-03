import type { IpcMain } from "electron";

export function registerAgentPlanningIpc(args: {
  ipcMain: IpcMain;
  makePlan: (intent: string, projectRoot?: string) => any;
  redactText: (text: string) => { redactedText: string };
  fetchRemotePlan: (payload: { intentText: string; projectRoot: string }) => Promise<any>;
  allowLocalEngineFallback: boolean;
}) {
  const { ipcMain } = args;

  // Minimal local planner endpoint (legacy UI path)
  ipcMain.handle("agent:plan", async (_event, intent: string) => {
    return args.makePlan(intent);
  });

  // Warp-like planner endpoint with remote agentd-first behavior.
  ipcMain.handle("rina:agent:plan", async (_event, payload: { intentText: string; projectRoot: string }) => {
    const intentText = String(payload?.intentText || "");
    const projectRoot = String(payload?.projectRoot || "");
    const safeIntentText = args.redactText(intentText).redactedText;
    try {
      return await args.fetchRemotePlan({ intentText: safeIntentText, projectRoot });
    } catch (error) {
      if (!args.allowLocalEngineFallback) throw error;

      const local = args.makePlan(safeIntentText, projectRoot);
      const steps = (local?.steps || []).map((s: any) => ({
        tool: "terminal.write",
        stepId: s.id,
        input: {
          command: s.command,
          cwd: projectRoot || process.cwd(),
          timeoutMs: 300_000,
        },
      }));
      return {
        id: local.id,
        intent: safeIntentText,
        reasoning: local.reasoning,
        steps,
      };
    }
  });
}
