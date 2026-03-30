import { getConfig } from './config';
import type { DiagnosticRunSummary } from './diagnostics';
import type { EntitlementService, EntitlementSnapshot } from './entitlements';
import type { CompanionWorkspaceContext } from './workspaceContext';

export interface ChatApiAction {
  command: 'rinawarp.runFreeDiagnostic' | 'rinawarp.openPack' | 'rinawarp.openPacks' | 'rinawarp.upgradeToPro' | 'rinawarp.refreshEntitlements';
  label: string;
  args?: unknown[];
}

export interface ChatApiReply {
  actions?: ChatApiAction[];
  message: string;
  mode?: 'fallback' | 'model';
}

export class CompanionChatApiClient {
  constructor(private readonly entitlements: EntitlementService) {}

  async sendChat(input: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    snapshot: EntitlementSnapshot;
    diagnostic?: DiagnosticRunSummary;
    workspaceContext?: CompanionWorkspaceContext;
  }): Promise<ChatApiReply> {
    const token = await this.entitlements.getSessionToken();
    if (!token) {
      throw new Error('Connect your account before chatting with Rina.');
    }

    const config = getConfig();
    const response = await fetch(`${config.baseUrl}/api/vscode/chat`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client: {
          extensionVersion: '0.0.1',
          product: 'rinawarp-companion',
        },
        messages: input.messages,
        workspaceContext: {
          diagnostic: input.diagnostic
            ? {
                findings: input.diagnostic.findings,
                recommendedPack: input.diagnostic.recommendedPack,
                recommendedReason: input.diagnostic.recommendedReason,
                workspaceName: input.diagnostic.workspaceName,
              }
            : undefined,
          hasWorkspace: Boolean(input.workspaceContext?.hasWorkspace),
          packageManagerHint: input.workspaceContext?.packageManagerHint,
          packageName: input.workspaceContext?.packageName,
          packageScripts: input.workspaceContext?.packageScripts,
          markers: input.workspaceContext?.markers,
          plan: input.snapshot.plan,
          topLevelEntries: input.workspaceContext?.topLevelEntries,
          workspaceName: input.workspaceContext?.workspaceName,
          workspaceSummary: input.workspaceContext?.summary,
        },
      }),
    });

    if (response.status === 401) {
      throw new Error('Your RinaWarp session expired. Reconnect your account and try again.');
    }

    if (!response.ok) {
      throw new Error(`Chat request failed with status ${response.status}.`);
    }

    return (await response.json()) as ChatApiReply;
  }
}
