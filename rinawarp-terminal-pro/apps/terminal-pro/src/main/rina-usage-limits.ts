export type RinaPlan = "free" | "pro_monthly" | "team_seat_monthly";

export type UsageLimit = {
  agentRunsPerDay?: number;
  agentRunsPerMonth?: number;
  maxAgentSteps: number;
  maxToolCalls: number;
  maxPatchBytes: number;
  maxCommandMs: number;
};

export const RINA_USAGE_LIMITS: Record<RinaPlan, UsageLimit> = {
  free: {
    agentRunsPerDay: 10,
    maxAgentSteps: 5,
    maxToolCalls: 20,
    maxPatchBytes: 20_000,
    maxCommandMs: 30_000,
  },
  pro_monthly: {
    agentRunsPerMonth: 300,
    maxAgentSteps: 12,
    maxToolCalls: 60,
    maxPatchBytes: 80_000,
    maxCommandMs: 120_000,
  },
  team_seat_monthly: {
    agentRunsPerMonth: 1000,
    maxAgentSteps: 20,
    maxToolCalls: 120,
    maxPatchBytes: 150_000,
    maxCommandMs: 180_000,
  },
};
