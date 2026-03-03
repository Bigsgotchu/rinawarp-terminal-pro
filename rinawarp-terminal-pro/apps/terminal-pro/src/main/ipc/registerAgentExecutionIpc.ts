import type { IpcMain, WebContents } from "electron";

type PlanRunState = {
  stopped: boolean;
  currentStreamId?: string;
  agentdPlanRunId?: string;
};

export function registerAgentExecutionIpc(args: {
  ipcMain: IpcMain;
  newPlanRunId: () => string;
  resolveProjectRootSafe: (input?: string) => string;
  ensureStructuredSession: (args: { source: string; projectRoot: string; preferredId?: string }) => void;
  runningPlanRuns: Map<string, PlanRunState>;
  safeSend: (target: WebContents | null | undefined, channel: string, payload?: unknown) => boolean;
  riskFromPlanStep: (step: any) => "read" | "safe-write" | "high-impact";
  gateProfileCommand: (args: {
    projectRoot: string;
    command: string;
    risk: "read" | "safe-write" | "high-impact";
    confirmed: boolean;
    confirmationText: string;
  }) => { ok: true } | { ok: false; message: string };
  evaluatePolicyGate: (command: string, confirmed: boolean, confirmationText: string) => { ok: boolean; message?: string };
  executeRemotePlan: (payload: {
    plan: any[];
    projectRoot: string;
    confirmed: boolean;
    confirmationText: string;
  }) => Promise<{ ok: true; planRunId: string }>;
  pipeAgentdSseToRenderer: (args: {
    eventSender: WebContents;
    localPlanRunId: string;
    agentdPlanRunId: string;
    runId: string;
  }) => Promise<string | undefined>;
  allowLocalEngineFallback: boolean;
  createStreamId: () => string;
  startStreamingStepViaEngine: (args: {
    webContents: WebContents;
    streamId: string;
    step: { id: string; tool: "terminal"; command: string; risk: "read" | "safe-write" | "high-impact" };
    confirmed: boolean;
    confirmationText: string;
    projectRoot: string;
  }) => Promise<unknown>;
  haltReasonFromFallbackStep: (result: any) => string | null;
}) {
  const { ipcMain } = args;

  ipcMain.handle(
    "rina:executePlanStream",
    async (
      event,
      payload: {
        plan: any[];
        projectRoot: string;
        confirmed: boolean;
        confirmationText: string;
      },
    ) => {
      const planRunId = args.newPlanRunId();
      const runId = `run_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const projectRoot = args.resolveProjectRootSafe(payload.projectRoot || process.cwd());
      args.ensureStructuredSession({
        source: "execute_plan_stream",
        projectRoot,
        preferredId: planRunId,
      });

      args.runningPlanRuns.set(planRunId, { stopped: false });
      args.safeSend(event.sender, "rina:plan:run:start", { planRunId });

      for (const rawStep of payload.plan || []) {
        const cmd = rawStep?.input?.command;
        if (typeof cmd !== "string") continue;
        const risk = args.riskFromPlanStep(rawStep);
        const profileGate = args.gateProfileCommand({
          projectRoot,
          command: cmd,
          risk,
          confirmed: payload.confirmed,
          confirmationText: payload.confirmationText ?? "",
        });
        if (!profileGate.ok) {
          const haltReason = profileGate.message;
          args.safeSend(event.sender, "rina:plan:run:end", {
            planRunId,
            ok: false,
            haltedBecause: haltReason,
          });
          args.runningPlanRuns.delete(planRunId);
          return { runId, planRunId, haltedStepId: rawStep?.stepId ?? null, haltReason };
        }
        const gate = args.evaluatePolicyGate(cmd, payload.confirmed, payload.confirmationText ?? "");
        if (!gate.ok) {
          const haltReason = gate.message || "Blocked by policy.";
          args.safeSend(event.sender, "rina:plan:run:end", {
            planRunId,
            ok: false,
            haltedBecause: haltReason,
          });
          args.runningPlanRuns.delete(planRunId);
          return { runId, planRunId, haltedStepId: rawStep?.stepId ?? null, haltReason };
        }
      }

      let haltedStepId: string | null = null;
      let haltReason = "";

      try {
        const execResp = await args.executeRemotePlan({
          plan: payload.plan,
          projectRoot,
          confirmed: payload.confirmed,
          confirmationText: payload.confirmationText ?? "",
        });
        const state = args.runningPlanRuns.get(planRunId);
        if (state) state.agentdPlanRunId = execResp.planRunId;

        haltReason =
          (await args.pipeAgentdSseToRenderer({
            eventSender: event.sender,
            localPlanRunId: planRunId,
            agentdPlanRunId: execResp.planRunId,
            runId,
          })) || "";
      } catch (error) {
        if (!args.allowLocalEngineFallback) {
          haltedStepId = payload.plan[0]?.stepId ?? null;
          haltReason = error instanceof Error ? error.message : String(error);
        } else {
          for (const step of payload.plan) {
            const state = args.runningPlanRuns.get(planRunId);
            if (!state || state.stopped) {
              haltedStepId = step.stepId;
              haltReason = "stop_requested";
              break;
            }
            const streamId = args.createStreamId();
            state.currentStreamId = streamId;
            const command = step?.input?.command;
            if (typeof command !== "string") {
              args.safeSend(event.sender, "rina:stream:end", {
                streamId,
                ok: false,
                code: null,
                cancelled: false,
                error: "Invalid step input: missing command",
                report: { ok: false, haltedBecause: "unknown_tool", steps: [] },
              });
              haltedStepId = step.stepId;
              haltReason = "Invalid step input";
              break;
            }
            args.safeSend(event.sender, "rina:plan:stepStart", {
              planRunId,
              runId,
              streamId,
              step: {
                stepId: step.stepId,
                tool: "terminal",
                input: step.input,
              },
            });
            const toolStep = {
              id: step.stepId ?? `step_${streamId}`,
              tool: "terminal" as const,
              command,
              risk: args.riskFromPlanStep(step),
            };
            const stepResult = await args.startStreamingStepViaEngine({
              webContents: event.sender,
              streamId,
              step: toolStep,
              confirmed: payload.confirmed,
              confirmationText: payload.confirmationText ?? "",
              projectRoot,
            });
            state.currentStreamId = undefined;
            const stepHalt = args.haltReasonFromFallbackStep(stepResult);
            if (stepHalt) {
              haltedStepId = step.stepId ?? toolStep.id;
              haltReason = stepHalt;
              break;
            }
          }
        }
      } finally {
        args.safeSend(event.sender, "rina:plan:run:end", {
          planRunId,
          ok: !haltReason,
          haltedBecause: haltReason || undefined,
        });
        args.runningPlanRuns.delete(planRunId);
      }

      return { runId, planRunId, haltedStepId, haltReason };
    },
  );

  ipcMain.handle("agent:execute", async () => {
    const results: { output: string; error?: string }[] = [];
    return results;
  });
}
