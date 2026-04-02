import { defineToken } from "../../runtime-core/dist/index.js";

import type { AgentdClient } from "./contracts/agentd.js";
import type { DiagnosticsService } from "./contracts/diagnostics.js";
import type { LicensingService } from "./contracts/licensing.js";
import type { IpcRegistrar } from "./contracts/platform.js";
import type { TeamService } from "./contracts/team.js";
import type { WorkspaceService } from "./contracts/workspace.js";

export const TOKENS = {
  workspaceService: defineToken<WorkspaceService>("workspace.service"),
  licensingService: defineToken<LicensingService>("licensing.service"),
  agentdClient: defineToken<AgentdClient>("agentd.client"),
  diagnosticsService: defineToken<DiagnosticsService>("diagnostics.service"),
  teamService: defineToken<TeamService>("team.service"),
  ipcRegistrar: defineToken<IpcRegistrar>("platform.ipc.registrar"),
} as const;
