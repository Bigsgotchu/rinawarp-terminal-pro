import type { Role, TeamDb } from "./team-storage.js";

export function getCurrentRole(loadTeamDb: () => TeamDb): Role {
  const team = loadTeamDb();
  const user = team.currentUser || "owner@local";
  const role = team.members.find((m) => m.email === user)?.role;
  return role || "owner";
}

export function getCurrentUserEmail(loadTeamDb: () => TeamDb): string {
  const team = loadTeamDb();
  return team.currentUser || "owner@local";
}

export function roleRank(role: Role): number {
  if (role === "owner") return 3;
  if (role === "operator") return 2;
  return 1;
}

export function hasRoleAtLeast(current: Role, required: Role): boolean {
  return roleRank(current) >= roleRank(required);
}
