import type { RinaIntent } from "@rinawarp/rina-core";

export type RinaRequestTrace = {
  requestId?: string;
  intentId?: string;
  transactionId?: string;
};

export type ProviderSuggestedAction = {
  label: string;
  command: string;
  risk: "read" | "safe-write" | "destructive";
  expectedEffect: string;
  rollbackAwareness: string;
  verificationHint: string;
};

export type ProviderRequest = {
  intent?: RinaIntent;
  trace?: RinaRequestTrace;
  message: string;
  workspace: {
    name: string;
    packageManager: "npm" | "pnpm" | "yarn" | "unknown";
    files: Array<{ path: string; summary?: string }>;
    tree?: string[];
    readme?: { path: string; summary: string };
    docs?: Array<{ path: string; summary: string }>;
    scripts?: Record<string, string>;
    dependencies?: string[];
    devDependencies?: string[];
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
  const scripts = Object.entries(request.workspace.scripts || {}).slice(0, 20);
  const scriptBlock = scripts.length
    ? scripts.map(([name, command]) => `- ${name}: ${command}`).join("\n")
    : "- none";
  const dependencies = [
    ...(request.workspace.dependencies || []).slice(0, 18),
    ...(request.workspace.devDependencies || []).slice(0, 18).map((name) => `${name} (dev)`),
  ];
  const dependencyBlock = dependencies.length ? dependencies.join(", ") : "none";
  const treeBlock = request.workspace.tree?.length
    ? request.workspace.tree.slice(0, 120).map((file) => `- ${file}`).join("\n")
    : "- none";
  const docs = [
    request.workspace.readme,
    ...(request.workspace.docs || []),
  ].filter(Boolean) as Array<{ path: string; summary: string }>;
  const docsBlock = docs.length
    ? docs.slice(0, 8).map((doc) => `- ${doc.path}: ${doc.summary}`).join("\n")
    : "- none";

  return [
    "You are Rina, a cloud-backed AI terminal assistant.",
    "Answer naturally and concisely.",
    "You may suggest terminal actions, but the desktop safety engine will classify and require approval before anything runs.",
    "Never ask the desktop user for provider API keys.",
    "For project-understanding questions, explain from the provided repo facts first: package metadata, scripts, file tree, and docs.",
    "Do not claim to have read files that are not in the provided context.",
    "For questions like 'what does this project do', 'main packages', or 'explain the architecture', prefer explanation-only responses with no command.",
    "For 'how do I run this app' or 'where is the build script', mention the relevant package script and suggest at most one read/run command when useful.",
    "Return JSON with reply, suggestedActions, and usage only.",
    "",
    `User message: ${request.message}`,
    `Workspace: ${request.workspace.name}`,
    `Package manager: ${request.workspace.packageManager}`,
    `Client: ${request.client.appVersion} on ${request.client.platform}`,
    "",
    "Scripts:",
    scriptBlock,
    "",
    "Dependencies:",
    dependencyBlock,
    "",
    "Docs:",
    docsBlock,
    "",
    "File tree:",
    treeBlock,
    "",
    "Visible files:",
    files,
  ].join("\n");
}
