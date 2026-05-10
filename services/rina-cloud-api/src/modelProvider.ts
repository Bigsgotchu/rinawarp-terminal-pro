export type ProviderSuggestedAction = {
  label: string;
  command: string;
  risk: "read" | "safe-write" | "destructive";
  expectedEffect: string;
  rollbackAwareness: string;
  verificationHint: string;
};

export type ProviderRequest = {
  message: string;
  workspace: {
    name: string;
    packageManager: "npm" | "pnpm" | "yarn" | "unknown";
    files: Array<{ path: string; summary?: string }>;
    packageJson?: object;
  };
  client: {
    appVersion: string;
    platform: string;
  };
};

export type ProviderResponse = {
  reply: string;
  suggestedActions: ProviderSuggestedAction[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};

export type ModelProvider = {
  complete(request: ProviderRequest): Promise<ProviderResponse>;
};

export function buildAgentPrompt(request: ProviderRequest): string {
  const files = request.workspace.files.length
    ? request.workspace.files.map((file) => `- ${file.path}: ${file.summary || "listed"}`).join("\n")
    : "- none";
  return [
    "You are Rina, a cloud-backed AI terminal assistant.",
    "Answer naturally and concisely.",
    "You may suggest terminal actions, but the desktop safety engine will classify and require approval before anything runs.",
    "Never ask the desktop user for provider API keys.",
    "Return JSON with reply, suggestedActions, and usage only.",
    "",
    `User message: ${request.message}`,
    `Workspace: ${request.workspace.name}`,
    `Package manager: ${request.workspace.packageManager}`,
    `Client: ${request.client.appVersion} on ${request.client.platform}`,
    "",
    "Visible files:",
    files,
  ].join("\n");
}
