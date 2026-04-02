export type TeamRole = "owner" | "admin" | "member";

export interface TeamMember {
  readonly email: string;
  readonly role: TeamRole;
}

export interface TeamDatabase {
  readonly workspaceId: string;
  readonly currentUser: string;
  readonly members: readonly TeamMember[];
  readonly seatsAllowed: number;
}

export interface TeamService {
  loadTeamDb(): TeamDatabase;
  saveTeamDb(value: TeamDatabase): TeamDatabase;
  normalizeRole(role: unknown): TeamRole;
  getCurrentRole(): TeamRole;
  hasRoleAtLeast(current: string, required: TeamRole): boolean;
}
