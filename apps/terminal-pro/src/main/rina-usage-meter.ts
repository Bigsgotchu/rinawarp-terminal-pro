import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import electron from "electron";
import { RINA_USAGE_LIMITS, type RinaPlan } from "./rina-usage-limits.js";

const { app } = electron;

type UsageState = {
  dayKey: string;
  monthKey: string;
  agentRunsToday: number;
  agentRunsThisMonth: number;
  toolCallsToday: number;
  patchBytesToday: number;
};

const DEFAULT_STATE: UsageState = {
  dayKey: "",
  monthKey: "",
  agentRunsToday: 0,
  agentRunsThisMonth: 0,
  toolCallsToday: 0,
  patchBytesToday: 0,
};

function usagePath(): string {
  const override = String(process.env.RINAWARP_USAGE_FILE || "").trim();
  if (override) return override;
  const userDataDir = typeof app?.getPath === "function"
    ? app.getPath("userData")
    : path.join(os.tmpdir(), "rinawarp-test-data");
  return path.join(userDataDir, "rina-usage.json");
}

function currentDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function resetIfNeeded(state: UsageState): UsageState {
  const today = currentDayKey();
  const month = currentMonthKey();
  return {
    ...state,
    dayKey: today,
    monthKey: month,
    agentRunsToday: state.dayKey === today ? state.agentRunsToday : 0,
    toolCallsToday: state.dayKey === today ? state.toolCallsToday : 0,
    patchBytesToday: state.dayKey === today ? state.patchBytesToday : 0,
    agentRunsThisMonth: state.monthKey === month ? state.agentRunsThisMonth : 0,
  };
}

async function readUsage(): Promise<UsageState> {
  try {
    const raw = await fs.readFile(usagePath(), "utf8");
    const parsed = JSON.parse(raw) as UsageState;
    return resetIfNeeded(parsed);
  } catch {
    return resetIfNeeded({ ...DEFAULT_STATE });
  }
}

async function writeUsage(state: UsageState): Promise<void> {
  const target = usagePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(state, null, 2), "utf8");
}

export async function getRinaUsageStatus(plan: RinaPlan) {
  const state = await readUsage();
  const limits = RINA_USAGE_LIMITS[plan];
  return {
    plan,
    usage: state,
    limits,
    remainingAgentRunsToday:
      limits.agentRunsPerDay == null
        ? null
        : Math.max(0, limits.agentRunsPerDay - state.agentRunsToday),
    remainingAgentRunsThisMonth:
      limits.agentRunsPerMonth == null
        ? null
        : Math.max(0, limits.agentRunsPerMonth - state.agentRunsThisMonth),
  };
}

export async function assertCanStartAgentRun(plan: RinaPlan) {
  const state = await readUsage();
  const limits = RINA_USAGE_LIMITS[plan];
  if (limits.agentRunsPerDay != null && state.agentRunsToday >= limits.agentRunsPerDay) {
    return {
      ok: false as const,
      reason: `You've used today's ${limits.agentRunsPerDay} free agent runs. Upgrade to Pro for more repo fixes.`,
    };
  }
  if (limits.agentRunsPerMonth != null && state.agentRunsThisMonth >= limits.agentRunsPerMonth) {
    return {
      ok: false as const,
      reason: `You've used this month's ${limits.agentRunsPerMonth} agent runs.`,
    };
  }
  return { ok: true as const };
}

export async function recordAgentRunStarted(plan: RinaPlan) {
  const check = await assertCanStartAgentRun(plan);
  if (!check.ok) return check;
  const state = await readUsage();
  state.agentRunsToday += 1;
  state.agentRunsThisMonth += 1;
  await writeUsage(state);
  return { ok: true as const };
}

export async function recordToolCall() {
  const state = await readUsage();
  state.toolCallsToday += 1;
  await writeUsage(state);
}

export async function recordPatchBytes(bytes: number) {
  const state = await readUsage();
  state.patchBytesToday += Math.max(0, bytes);
  await writeUsage(state);
}
