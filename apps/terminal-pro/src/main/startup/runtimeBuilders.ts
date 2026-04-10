import type {
  AgentdIpcWrappers,
  AgentdRuntime,
  BuildPlanHelpers,
  FixProjectFlowDeps,
  FactoryDeps,
  JsonPersistenceHelpers,
  LicenseStateHelpers,
  PlanExecutionHelpers,
  PersistenceDeps,
  PolicyGateHelpers,
  RuntimeState,
  StoredEntitlement,
  TeamDb,
  TeamRuntime,
  ThemeRegistryBuilderDeps,
  ThemeRegistryDeps,
  UpdateIpcBuilderDeps,
  UpdateIpcDeps,
} from "./runtimeTypes.js";
import type {
  LicenseStatus,
  LicenseTier,
  TeamDatabase,
  TeamRole,
  TeamService,
} from "../../../../../packages/runtime-contracts/dist/index.js";
import type { LicensingRuntimeService } from "../../../../../packages/runtime-feature-licensing/dist/index.js";
import { createTeamService } from "../../../../../packages/runtime-feature-team/dist/index.js";

export function createRuntimeState(): RuntimeState {
  return {
    structuredSessionStore: null,
    ctx: {
      structuredSessionStore: null,
      lastLoadedThemePath: null,
      lastLoadedPolicyPath: null,
    },
  };
}

export function createJsonPersistenceHelpers(
  deps: PersistenceDeps,
): JsonPersistenceHelpers {
  return {
    readJson(filePath) {
      return deps.readJsonIfExists(deps.fs, filePath);
    },
    writeJson(filePath, value) {
      return deps.writeJsonFile(deps.fs, deps.path, filePath, value);
    },
  };
}

export function createThemeRegistryDeps(
  deps: ThemeRegistryBuilderDeps,
  runtimeState: RuntimeState,
): ThemeRegistryDeps {
  return {
    resolveResourcePath: deps.resolveResourcePath,
    warnIfUnexpectedPackagedResource: deps.warnIfUnexpectedPackagedResource,
    readJsonIfExists: (filePath) => deps.persistence.readJson(filePath),
    writeJsonFile: (filePath, value) => deps.persistence.writeJson(filePath, value),
    setLastLoadedThemePath: (filePath) => {
      runtimeState.ctx.lastLoadedThemePath = filePath;
    },
  };
}

export function createUpdateIpcDeps(
  ipcMain: unknown,
  deps: UpdateIpcBuilderDeps,
): UpdateIpcDeps {
  return {
    ipcMain,
    app: deps.app,
    fs: deps.fs,
    path: deps.path,
    shell: deps.shell,
  };
}

export function createFixProjectFlowDeps(args: {
  fetchRemotePlanForIpc: FixProjectFlowDeps["agentPlan"];
  evaluatePolicyGate: PolicyGateHelpers["evaluatePolicyGate"];
}): FixProjectFlowDeps {
  return {
    agentPlan: args.fetchRemotePlanForIpc,
    evaluatePolicy: (step) => {
      const gate = args.evaluatePolicyGate(step.command, false, "");
      return {
        ok: gate.ok,
        requiresConfirmation: step.risk === "high-impact",
        message: gate.message,
      };
    },
  };
}

export function createAgentdRuntime(args: {
  createAgentdIpcWrappers: FactoryDeps["createAgentdIpcWrappers"];
  agentdJson: AgentdRuntime["agentdJson"];
  isE2E: boolean;
  makePlan: BuildPlanHelpers["makePlan"];
  terminalWriteSafetyFields: PlanExecutionHelpers["terminalWriteSafetyFields"];
  e2ePlanPayloads: Map<unknown, unknown>;
  getCurrentRole: TeamRuntime["getCurrentRole"];
  hasRoleAtLeast: TeamRuntime["hasRoleAtLeast"];
}): Pick<
  AgentdIpcWrappers,
  | "daemonStatus"
  | "daemonTasks"
  | "daemonTaskAdd"
  | "daemonStart"
  | "daemonStop"
  | "fetchRemotePlanForIpc"
  | "executeRemotePlanForIpc"
  | "orchestratorIssueToPrForIpc"
  | "orchestratorGraphForIpc"
  | "orchestratorPrepareBranchForIpc"
  | "orchestratorCreatePrForIpc"
  | "orchestratorPrStatusForIpc"
  | "orchestratorWebhookAuditForIpc"
  | "orchestratorCiStatusForIpc"
  | "orchestratorReviewCommentForIpc"
  | "accountPlanForIpc"
  | "teamWorkspaceCreateForIpc"
  | "teamWorkspaceGetForIpc"
  | "teamInvitesListForIpc"
  | "teamInviteCreateForIpc"
  | "teamInviteRevokeForIpc"
  | "teamAuditListForIpc"
  | "teamBillingEnforcementForIpc"
> {
  const wrappers = args.createAgentdIpcWrappers({
    agentdJson: args.agentdJson,
    isE2E: args.isE2E,
    makePlan: args.makePlan,
    terminalWriteSafetyFields: args.terminalWriteSafetyFields,
    e2ePlanPayloads: args.e2ePlanPayloads,
    getCurrentRole: args.getCurrentRole,
    hasRoleAtLeast: args.hasRoleAtLeast,
  });

  return {
    daemonStatus: wrappers.daemonStatus,
    daemonTasks: wrappers.daemonTasks,
    daemonTaskAdd: wrappers.daemonTaskAdd,
    daemonStart: wrappers.daemonStart,
    daemonStop: wrappers.daemonStop,
    fetchRemotePlanForIpc: wrappers.fetchRemotePlanForIpc,
    executeRemotePlanForIpc: wrappers.executeRemotePlanForIpc,
    orchestratorIssueToPrForIpc: wrappers.orchestratorIssueToPrForIpc,
    orchestratorGraphForIpc: wrappers.orchestratorGraphForIpc,
    orchestratorPrepareBranchForIpc: wrappers.orchestratorPrepareBranchForIpc,
    orchestratorCreatePrForIpc: wrappers.orchestratorCreatePrForIpc,
    orchestratorPrStatusForIpc: wrappers.orchestratorPrStatusForIpc,
    orchestratorWebhookAuditForIpc: wrappers.orchestratorWebhookAuditForIpc,
    orchestratorCiStatusForIpc: wrappers.orchestratorCiStatusForIpc,
    orchestratorReviewCommentForIpc: wrappers.orchestratorReviewCommentForIpc,
    accountPlanForIpc: wrappers.accountPlanForIpc,
    teamWorkspaceCreateForIpc: wrappers.teamWorkspaceCreateForIpc,
    teamWorkspaceGetForIpc: wrappers.teamWorkspaceGetForIpc,
    teamInvitesListForIpc: wrappers.teamInvitesListForIpc,
    teamInviteCreateForIpc: wrappers.teamInviteCreateForIpc,
    teamInviteRevokeForIpc: wrappers.teamInviteRevokeForIpc,
    teamAuditListForIpc: wrappers.teamAuditListForIpc,
    teamBillingEnforcementForIpc: wrappers.teamBillingEnforcementForIpc,
  };
}

function normalizeLicenseTier(value: unknown): LicenseTier {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "free" || normalized === "starter" || normalized === "fix") return "free";
  if (normalized === "creator") return "pro";
  if (normalized === "pro") return "pro";
  if (normalized === "power") return "team";
  if (normalized === "team") return "team";
  if (normalized === "enterprise") return "enterprise";
  if (normalized === "founder") return "enterprise";
  if (normalized === "pioneer") return "enterprise";
  return "free";
}

function normalizeLicenseStatus(value: unknown): LicenseStatus | undefined {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "expired") return "expired";
  if (normalized === "invalid") return "invalid";
  if (normalized === "free" || normalized === "starter") return "free";
  if (normalized === "unknown") return "unknown";
  return undefined;
}

function normalizeStoredEntitlement(
  data: StoredEntitlement,
): Parameters<LicensingRuntimeService["applyStoredEntitlement"]>[0] {
  return {
    tier: normalizeLicenseTier(data.tier),
    token: data.token,
    expiresAt: data.expiresAt,
    customerId: data.customerId,
    verifiedAt: data.verifiedAt,
    lastVerifiedAt: data.lastVerifiedAt,
    status: data.status,
  };
}

export function createLicensingRuntimeAdapter(
  licensingService: LicensingRuntimeService,
): Pick<
  LicenseStateHelpers,
  | "applyVerifiedLicense"
  | "resetLicenseToStarter"
  | "getLicenseState"
  | "getCurrentLicenseCustomerId"
  | "getLicenseTier"
  | "getLicenseToken"
  | "refreshLicenseState"
  | "saveEntitlements"
  | "loadEntitlements"
  | "applyStoredEntitlement"
  | "isEntitlementStale"
> {
  return {
    applyVerifiedLicense(data) {
      return licensingService.applyVerifiedLicense({
        tier: normalizeLicenseTier(data.tier),
        licenseToken: data.license_token,
        expiresAt: data.expires_at,
        customerId: data.customer_id,
        status: normalizeLicenseStatus(data.status),
      });
    },
    resetLicenseToStarter() {
      licensingService.resetToStarter();
    },
    getLicenseState() {
      return licensingService.getLicenseState();
    },
    getCurrentLicenseCustomerId() {
      return licensingService.getCurrentLicenseCustomerId();
    },
    getLicenseTier() {
      return licensingService.getLicenseTier();
    },
    getLicenseToken() {
      return licensingService.getLicenseToken();
    },
    refreshLicenseState() {
      return licensingService.refreshLicenseState();
    },
    saveEntitlements() {
      licensingService.saveEntitlements();
    },
    loadEntitlements() {
      return licensingService.loadEntitlements();
    },
    applyStoredEntitlement(data) {
      licensingService.applyStoredEntitlement(normalizeStoredEntitlement(data));
    },
    isEntitlementStale(data) {
      return licensingService.isEntitlementStale(normalizeStoredEntitlement(data));
    },
  };
}

function teamDbFromService(team: TeamDatabase): TeamDb {
  return {
    workspaceId: team.workspaceId,
    currentUser: team.currentUser,
    members: team.members.map((member) => ({
      email: member.email,
      role: member.role,
    })),
    seatsAllowed: team.seatsAllowed,
  };
}

export function createTeamCompat(
  teamService: TeamService,
): Pick<
  TeamRuntime,
  "getCurrentRole" | "hasRoleAtLeast" | "loadTeamDb" | "saveTeamDb" | "normalizeRole"
> {
  return {
    getCurrentRole: () => teamService.getCurrentRole(),
    hasRoleAtLeast: (current: string, required: string) =>
      teamService.hasRoleAtLeast(current, required as TeamRole),
    loadTeamDb: () => teamDbFromService(teamService.loadTeamDb()),
    saveTeamDb: (value: TeamDb) =>
      teamDbFromService(
        teamService.saveTeamDb({
          workspaceId: String(value?.workspaceId || ""),
          currentUser: String(value?.currentUser || "owner@local"),
          members: Array.isArray(value?.members)
            ? value.members.map((member) => ({
                email: String(member?.email || "").trim().toLowerCase(),
                role: teamService.normalizeRole(member?.role),
              }))
            : [],
          seatsAllowed: Number(value?.seatsAllowed || value?.members?.length || 1),
        }),
      ),
    normalizeRole: teamService.normalizeRole.bind(teamService),
  };
}

export function createTeamRuntimeHelpers(args: {
  readJsonIfExists: (filePath: string) => unknown;
  writeJsonFile: (filePath: string, value: unknown) => unknown;
  teamFile: () => string;
}): Pick<
  TeamRuntime,
  "getCurrentRole" | "hasRoleAtLeast" | "loadTeamDb" | "saveTeamDb" | "normalizeRole"
> {
  const teamService = createTeamService({
    readJsonIfExists: args.readJsonIfExists,
    writeJsonFile: args.writeJsonFile,
    teamFile: args.teamFile,
  });

  return createTeamCompat(teamService);
}
