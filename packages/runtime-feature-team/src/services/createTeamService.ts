import type {
  TeamDatabase,
  TeamRole,
  TeamService,
} from "../../../runtime-contracts/dist/index.js";

export interface TeamServiceConfig {
  readonly readJsonIfExists: (filePath: string) => unknown;
  readonly writeJsonFile: (filePath: string, value: unknown) => unknown;
  readonly teamFile: () => string;
}

const DEFAULT_TEAM_DB: TeamDatabase = {
  workspaceId: "",
  currentUser: "owner@local",
  members: [{ email: "owner@local", role: "owner" }],
  seatsAllowed: 1,
};

function normalizeRole(role: unknown): TeamRole {
  const value = String(role || "member").trim().toLowerCase();
  if (value === "owner") return "owner";
  if (value === "admin" || value === "operator") return "admin";
  return "member";
}

function normalizeTeamDb(input: unknown): TeamDatabase {
  const team = (input ?? {}) as {
    workspaceId?: unknown;
    currentUser?: unknown;
    members?: Array<{ email?: unknown; role?: unknown }>;
    seatsAllowed?: unknown;
  };

  const members =
    Array.isArray(team.members) && team.members.length > 0
      ? team.members.map((member) => ({
          email: String(member?.email || "").trim().toLowerCase(),
          role: normalizeRole(member?.role),
        }))
      : DEFAULT_TEAM_DB.members;

  return {
    workspaceId: String(team.workspaceId || ""),
    currentUser: String(team.currentUser || "owner@local"),
    members,
    seatsAllowed: Math.max(
      1,
      Number(team.seatsAllowed || team.members?.length || 1),
    ),
  };
}

function roleRank(role: unknown): number {
  const normalized = normalizeRole(role);
  if (normalized === "owner") return 3;
  if (normalized === "admin") return 2;
  return 1;
}

export function createTeamService(config: TeamServiceConfig): TeamService {
  return {
    loadTeamDb(): TeamDatabase {
      return normalizeTeamDb(
        config.readJsonIfExists(config.teamFile()) ?? DEFAULT_TEAM_DB,
      );
    },

    saveTeamDb(value: TeamDatabase): TeamDatabase {
      const payload = normalizeTeamDb(value);
      config.writeJsonFile(config.teamFile(), payload);
      return payload;
    },

    normalizeRole,

    getCurrentRole(): TeamRole {
      const team = this.loadTeamDb();
      const user = team.currentUser || "owner@local";
      const role = team.members.find((member) => member.email === user)?.role;
      return normalizeRole(role || "owner");
    },

    hasRoleAtLeast(current: string, required: TeamRole): boolean {
      return roleRank(current) >= roleRank(required);
    },
  };
}
