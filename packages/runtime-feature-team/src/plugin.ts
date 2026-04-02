import type {
  TeamDatabase,
  TeamRole,
  TeamService,
} from "../../runtime-contracts/dist/index.js";
import { TOKENS } from "../../runtime-contracts/dist/index.js";
import type { RuntimePlugin } from "../../runtime-core/dist/index.js";
import {
  createTeamService,
  type TeamServiceConfig,
} from "./services/createTeamService.js";

export interface TeamPluginConfig extends TeamServiceConfig {}

class DefaultTeamService implements TeamService {
  constructor(private readonly service: TeamService) {}

  loadTeamDb(): TeamDatabase {
    return this.service.loadTeamDb();
  }

  saveTeamDb(value: TeamDatabase): TeamDatabase {
    return this.service.saveTeamDb(value);
  }

  normalizeRole(role: unknown): TeamRole {
    return this.service.normalizeRole(role);
  }

  getCurrentRole(): TeamRole {
    return this.service.getCurrentRole();
  }

  hasRoleAtLeast(current: string, required: TeamRole): boolean {
    return this.service.hasRoleAtLeast(current, required);
  }
}

export const teamPlugin: RuntimePlugin<TeamPluginConfig> = {
  meta: {
    id: "feature.team",
    displayName: "Team",
    version: "1.0.0",
  },

  register(ctx) {
    const service = createTeamService(ctx.config);
    ctx.container.registerFactory(
      TOKENS.teamService,
      () => new DefaultTeamService(service),
      { singleton: true },
    );
  },
};
