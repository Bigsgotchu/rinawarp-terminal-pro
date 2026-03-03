import type { IpcMain, WebContents } from "electron";

type PlanRunState = {
  stopped: boolean;
  currentStreamId?: string;
  agentdPlanRunId?: string;
};

type RiskLevel = "read" | "safe-write" | "high-impact";

type ExecutePlanPayload = {
  plan: any[];
  projectRoot: string;
  confirmed: boolean;
  confirmationText: string;
};

type RegisterAgentExecutionArgs = {
  ipcMain: IpcMain;
  newPlanRunId: () => string;
  resolveProjectRootSafe: (input?: string) => string;
  ensureStructuredSession: (args: { source: string; projectRoot: string; preferredId?: string }) => void;
  runningPlanRuns: Map<string, PlanRunState>;
  safeSend: (target: WebContents | null | undefined, channel: string, payload?: unknown) => boolean;
  riskFromPlanStep: (step: any) => RiskLevel;
  gateProfileCommand: (args: {
    projectRoot: string;
    command: string;
    risk: RiskLevel;
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
    step: { id: string; tool: "terminal"; command: string; risk: RiskLevel };
    confirmed: boolean;
    confirmationText: string;
    projectRoot: string;
  }) => Promise<unknown>;
  haltReasonFromFallbackStep: (result: any) => string | null;
  executeStepStream: (args: {
    eventSender: WebContents;
    step: any;
    confirmed: boolean;
    confirmationText: string;
    projectRoot: string;
  }) => Promise<{ streamId: string }>;
  streamCancel: (streamId: string) => Promise<unknown>;
  streamKill: (streamId: string) => Promise<unknown>;
  planStop: (planRunId: string) => Promise<unknown>;
};

function getHaltFromPreflight(args: RegisterAgentExecutionArgs, payload: ExecutePlanPayload, projectRoot: string) {
  for (const rawStep of payload.plan || []) {
    const command = rawStep?.input?.command;
    if (typeof command !== "string") continue;
    const risk = args.riskFromPlanStep(rawStep);
    const profileGate = args.gateProfileCommand({
      projectRoot,
      command,
      risk,
      confirmed: payload.confirmed,
      confirmationText: payload.confirmationText ?? "",
    });
    if (!profileGate.ok) {
      return {
        haltedStepId: rawStep?.stepId ?? null,
        haltReason: profileGate.message,
      };
    }
    const policyGate = args.evaluatePolicyGate(command, payload.confirmed, payload.confirmationText ?? "");
    if (!policyGate.ok) {
      return {
        haltedStepId: rawStep?.stepId ?? null,
        haltReason: policyGate.message || "Blocked by policy.",
      };
    }
  }
  return null;
}

async function runRemotePlan(
  args: RegisterAgentExecutionArgs,
  eventSender: WebContents,
  planRunId: string,
  runId: string,
  payload: ExecutePlanPayload,
  projectRoot: string,
): Promise<string> {
  const execResp = await args.executeRemotePlan({
    plan: payload.plan,
    projectRoot,
    confirmed: payload.confirmed,
    confirmationText: payload.confirmationText ?? "",
  });
  const state = args.runningPlanRuns.get(planRunId);
  if (state) state.agentdPlanRunId = execResp.planRunId;
  return (
    (await args.pipeAgentdSseToRenderer({
      eventSender,
      localPlanRunId: planRunId,
      agentdPlanRunId: execResp.planRunId,
      runId,
    })) || ""
  );
}

async function runFallbackPlan(
  args: RegisterAgentExecutionArgs,
  eventSender: WebContents,
  planRunId: string,
  runId: string,
  payload: ExecutePlanPayload,
  projectRoot: string,
) {
  for (const step of payload.plan) {
    const state = args.runningPlanRuns.get(planRunId);
    if (!state || state.stopped) {
      return { haltedStepId: step.stepId, haltReason: "stop_requested" };
    }
    const streamId = args.createStreamId();
    state.currentStreamId = streamId;
    const command = step?.input?.command;
    if (typeof command !== "string") {
      args.safeSend(eventSender, "rina:stream:end", {
        streamId,
        ok: false,
        code: null,
        cancelled: false,
        error: "Invalid step input: missing command",
        report: { ok: false, haltedBecause: "unknown_tool", steps: [] },
      });
      return { haltedStepId: step.stepId, haltReason: "Invalid step input" };
    }
    args.safeSend(eventSender, "rina:plan:stepStart", {
      planRunId,
      runId,
      streamId,
      step: { stepId: step.stepId, tool: "terminal", input: step.input },
    });
    const toolStep = {
      id: step.stepId ?? `step_${streamId}`,
      tool: "terminal" as const,
      command,
      risk: args.riskFromPlanStep(step),
    };
    const stepResult = await args.startStreamingStepViaEngine({
      webContents: eventSender,
      streamId,
      step: toolStep,
      confirmed: payload.confirmed,
      confirmationText: payload.confirmationText ?? "",
      projectRoot,
    });
    state.currentStreamId = undefined;
    const stepHalt = args.haltReasonFromFallbackStep(stepResult);
    if (stepHalt) {
      return { haltedStepId: step.stepId ?? toolStep.id, haltReason: stepHalt };
    }
  }
  return { haltedStepId: null, haltReason: "" };
}

async function handleExecutePlanStream(
  args: RegisterAgentExecutionArgs,
  eventSender: WebContents,
  payload: ExecutePlanPayload,
) {
  const planRunId = args.newPlanRunId();
  const runId = `run_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const projectRoot = args.resolveProjectRootSafe(payload.projectRoot || process.cwd());
  args.ensureStructuredSession({ source: "execute_plan_stream", projectRoot, preferredId: planRunId });
  args.runningPlanRuns.set(planRunId, { stopped: false });
  args.safeSend(eventSender, "rina:plan:run:start", { planRunId });

  const preflightHalt = getHaltFromPreflight(args, payload, projectRoot);
  if (preflightHalt) {
    args.safeSend(eventSender, "rina:plan:run:end", {
      planRunId,
      ok: false,
      haltedBecause: preflightHalt.haltReason,
    });
    args.runningPlanRuns.delete(planRunId);
    return { runId, planRunId, haltedStepId: preflightHalt.haltedStepId, haltReason: preflightHalt.haltReason };
  }

  let haltedStepId: string | null = null;
  let haltReason = "";
  try {
    haltReason = await runRemotePlan(args, eventSender, planRunId, runId, payload, projectRoot);
  } catch (error) {
    if (!args.allowLocalEngineFallback) {
      haltedStepId = payload.plan[0]?.stepId ?? null;
      haltReason = error instanceof Error ? error.message : String(error);
    } else {
      const fallback = await runFallbackPlan(args, eventSender, planRunId, runId, payload, projectRoot);
      haltedStepId = fallback.haltedStepId;
      haltReason = fallback.haltReason;
    }
  } finally {
    args.safeSend(eventSender, "rina:plan:run:end", {
      planRunId,
      ok: !haltReason,
      haltedBecause: haltReason || undefined,
    });
    args.runningPlanRuns.delete(planRunId);
  }
  return { runId, planRunId, haltedStepId, haltReason };
}

export function registerAgentExecutionIpc(args: RegisterAgentExecutionArgs) {
  const { ipcMain } = args;

  ipcMain.handle("rina:executePlanStream", async (event, payload: ExecutePlanPayload) =>
    handleExecutePlanStream(args, event.sender, payload),
  );

  ipcMain.handle(
    "rina:executeStepStream",
    async (
      event,
      step: any,
      confirmed: boolean,
      confirmationText: string,
      projectRoot: string,
    ) => args.executeStepStream({ eventSender: event.sender, step, confirmed, confirmationText, projectRoot }),
  );
  ipcMain.handle("rina:stream:cancel", async (_event, streamId: string) => args.streamCancel(streamId));
  ipcMain.handle("rina:stream:kill", async (_event, streamId: string) => args.streamKill(streamId));
  ipcMain.handle("rina:plan:stop", async (_event, planRunId: string) => args.planStop(planRunId));

  ipcMain.handle("agent:execute", async () => {
    const results: { output: string; error?: string }[] = [];
    return results;
  });
}
