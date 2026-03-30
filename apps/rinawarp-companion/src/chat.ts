import * as vscode from 'vscode';

import type { DiagnosticRunSummary } from './diagnostics';
import type { EntitlementSnapshot } from './entitlements';
import { hasActiveSelection } from './fixCode';
import { recordTelemetry } from './telemetry';
import { answerWorkspaceQuestion, canAnswerLocally, findRequestedFile, findRelevantConfigFile, gatherWorkspaceContext, inferRecommendedPack, type CompanionWorkspaceContext } from './workspaceContext';

export interface ChatAction {
  command:
    | 'rinawarp.connectAccount'
    | 'rinawarp.openChat'
    | 'rinawarp.openGettingStarted'
    | 'rinawarp.runFreeDiagnostic'
    | 'rinawarp.fixSelection'
    | 'rinawarp.fixFile'
    | 'rinawarp.openPack'
    | 'rinawarp.openPacks'
    | 'rinawarp.upgradeToPro'
    | 'rinawarp.refreshEntitlements'
    | 'rinawarp.openWorkspaceFile'
    | 'workbench.action.files.openFile';
  label: string;
  args?: unknown[];
}

interface ChatReply {
  actions?: ChatAction[];
  message: string;
  mode?: 'fallback' | 'model';
}

interface ChatApiClient {
  sendChat(input: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    snapshot: EntitlementSnapshot;
    diagnostic?: DiagnosticRunSummary;
    workspaceContext?: CompanionWorkspaceContext;
  }): Promise<ChatReply>;
}

interface ChatMessage {
  actions?: ChatAction[];
  content: string;
  role: 'assistant' | 'system' | 'user';
}

type IncomingWebviewMessage =
  | { type: 'ready' }
  | { type: 'send'; text?: string }
  | { type: 'clear' }
  | { type: 'action'; command?: string; args?: unknown[] };

export class CompanionChatProvider implements vscode.WebviewViewProvider {
  private static readonly STORAGE_KEY = 'rinawarp.chatState';
  private diagnostic?: DiagnosticRunSummary;
  private snapshot: EntitlementSnapshot;
  private readonly messages: ChatMessage[] = [];
  private pending = false;
  private lastError?: string;
  private stagedAction?: ChatAction;
  private view?: vscode.WebviewView;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly extensionUri: vscode.Uri,
    snapshot: EntitlementSnapshot,
    private readonly client: ChatApiClient,
  ) {
    this.snapshot = snapshot;
    void this.restoreState();
  }

  updateSnapshot(snapshot: EntitlementSnapshot): void {
    this.snapshot = snapshot;
    this.pushState();
  }

  updateDiagnostic(summary?: DiagnosticRunSummary): void {
    this.diagnostic = summary;
    this.pushState();
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.renderHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message: unknown) => {
      void this.handleWebviewMessage(message as IncomingWebviewMessage);
    });
    this.pushState();
  }

  private async handleWebviewMessage(message: IncomingWebviewMessage): Promise<void> {
    if (message.type === 'ready') {
      this.pushState();
      return;
    }

    if (message.type === 'clear') {
      this.messages.length = 0;
      this.lastError = undefined;
      this.stagedAction = undefined;
      recordTelemetry({ name: 'chat_cleared' });
      await this.persistState();
      this.pushState();
      return;
    }

    if (message.type === 'action' && message.command) {
      recordTelemetry({ name: 'chat_action_clicked', properties: { command: message.command } });
      await vscode.commands.executeCommand(message.command, ...(Array.isArray(message.args) ? message.args : []));
      return;
    }

    if (message.type !== 'send') {
      return;
    }

    const text = String(message.text || '').trim();
    if (!text || this.pending) {
      return;
    }

    if (!this.snapshot.email) {
      this.lastError = 'Connect your RinaWarp account before using chat.';
      this.pushState();
      return;
    }

    this.pending = true;
    this.lastError = undefined;
    this.messages.push({ role: 'user', content: text });
    recordTelemetry({
      name: 'chat_prompt_sent',
      properties: {
        plan: this.snapshot.plan,
        hasWorkspace: vscode.workspace.workspaceFolders?.length ? 'yes' : 'no',
      },
    });
    this.pushState();
    await this.persistState();

    try {
      if (isApprovalPrompt(text) && this.stagedAction) {
        const action = pickActionForPrompt(text, this.collectAvailableActions(), this.stagedAction);
        await vscode.commands.executeCommand(action.command, ...(Array.isArray(action.args) ? action.args : []));
        this.messages.push({
          role: 'assistant',
          content: `I handed that off to the trusted Companion action: ${action.label}.`,
        });
        recordTelemetry({
          name: 'chat_action_clicked',
          properties: { command: action.command },
        });
        this.stagedAction = undefined;
        return;
      }

      const workspaceContext = await gatherWorkspaceContext();
      if (isFixIntent(text)) {
        const actions = this.buildFixActions();
        if (!actions.length) {
          this.messages.push({
            role: 'assistant',
            content: 'I can help with fixes, but I need an active editor first. Open a file, or select code if you want a scoped fix. I can pop the file picker for you.',
            actions: [
              { command: 'workbench.action.files.openFile', label: 'Open File' },
            ],
          });
          this.stagedAction = undefined;
          recordTelemetry({
            name: 'chat_response_received',
            properties: {
              mode: 'local_tool',
              plan: this.snapshot.plan,
            },
          });
          return;
        }

        const primaryAction = /selection|selected|this part/i.test(text)
          ? actions.find((action) => action.command === 'rinawarp.fixSelection') || actions[0]
          : actions[0];

        this.messages.push({
          role: 'assistant',
          content: `I can hand that off without blocking you. ${primaryAction.label} will run in the background and patch the editor directly if the result looks usable.`,
          actions,
        });
        this.stagedAction = primaryAction;
        recordTelemetry({
          name: 'chat_response_received',
          properties: {
            mode: 'local_tool',
            plan: this.snapshot.plan,
          },
        });
        return;
      }

      if (canAnswerLocally(text)) {
        const actions = this.buildLocalActions(text, workspaceContext);
        const localAnswer = await answerWorkspaceQuestion(text, workspaceContext, this.diagnostic);
        this.messages.push({
          role: 'assistant',
          content: localAnswer,
          actions,
        });
        this.stagedAction = pickPrimaryAction(actions);
        recordTelemetry({
          name: 'chat_response_received',
          properties: {
            mode: 'local_tool',
            plan: this.snapshot.plan,
          },
        });
        return;
      }

      const reply = await this.client.sendChat({
        messages: this.toApiMessages(),
        snapshot: this.snapshot,
        diagnostic: this.diagnostic,
        workspaceContext,
      });

      this.messages.push({
        role: 'assistant',
        content: reply.message,
        actions: reply.actions,
      });
      this.stagedAction = pickPrimaryAction(reply.actions || []);
      recordTelemetry({
        name: 'chat_response_received',
        properties: {
          mode: reply.mode || 'fallback',
          plan: this.snapshot.plan,
        },
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unknown chat error';
      this.lastError = messageText;
      this.messages.push({
        role: 'system',
        content: `RinaWarp could not answer right now: ${messageText}`,
      });
      recordTelemetry({ name: 'chat_response_failed' });
    } finally {
      this.pending = false;
      await this.persistState();
      this.pushState();
    }
  }

  private toApiMessages(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.messages
      .filter((message): message is ChatMessage & { role: 'user' | 'assistant' } => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({ role: message.role, content: message.content }));
  }

  private pushState(): void {
    if (!this.view) {
      return;
    }

    void this.view.webview.postMessage({
      type: 'state',
      value: {
        diagnostic: this.diagnostic
          ? {
              recommendedPack: this.diagnostic.recommendedPack,
              workspaceName: this.diagnostic.workspaceName,
            }
          : undefined,
        isConnected: Boolean(this.snapshot.email),
        lastError: this.lastError,
        messages: this.messages,
        nextActionLabel: this.stagedAction?.label,
        pending: this.pending,
        plan: this.snapshot.plan,
        prompts: this.buildStarterPrompts(),
        starterActions: this.buildStarterActions(),
      },
    });
  }

  private buildStarterPrompts(): string[] {
    if (!this.snapshot.email) {
      return [];
    }

    const prompts = [
      'What should I do first in this workspace?',
      'Which RinaWarp pack should I run next?',
      'Explain what the free diagnostic is checking.',
    ];

    if (this.diagnostic?.recommendedPack) {
      prompts.unshift(`Why did you recommend ${this.diagnostic.recommendedPack}?`);
    }

    return prompts.slice(0, 3);
  }

  private buildStarterActions(): ChatAction[] {
    if (!this.snapshot.email) {
      return [
        { command: 'rinawarp.connectAccount', label: 'Connect Account' },
        { command: 'rinawarp.openGettingStarted', label: 'Open Getting Started' },
      ];
    }

    if (!this.diagnostic) {
      return [
        ...this.buildFixActions(),
        { command: 'rinawarp.runFreeDiagnostic', label: 'Run Free Diagnostic' },
        { command: 'rinawarp.openPacks', label: 'Open Capability Packs' },
      ];
    }

    return [
      ...this.buildFixActions(),
      { command: 'rinawarp.refreshEntitlements', label: 'Refresh Entitlements' },
      { command: 'rinawarp.openPacks', label: 'Open Capability Packs' },
    ];
  }

  private buildFixActions(): ChatAction[] {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return [];
    }

    const actions: ChatAction[] = [];
    if (hasActiveSelection(editor)) {
      actions.push({ command: 'rinawarp.fixSelection', label: 'Fix Selection' });
    }
    actions.push({ command: 'rinawarp.fixFile', label: 'Fix File' });
    return actions;
  }

  private collectAvailableActions(): ChatAction[] {
    const actions: ChatAction[] = [];
    for (const message of this.messages) {
      if (Array.isArray(message.actions) && message.actions.length) {
        actions.push(...message.actions);
      }
    }
    return actions.slice(-10);
  }

  private buildLocalActions(prompt: string, workspaceContext: CompanionWorkspaceContext): ChatAction[] {
    const actions: ChatAction[] = [];
    const fixActions = this.buildFixActions();
    if (fixActions.length && /\b(fix|improve|clean up|refactor|repair|rewrite)\b/i.test(prompt)) {
      actions.push(...fixActions);
    }
    const fileMatch = findRequestedFile(prompt.toLowerCase(), workspaceContext.fileSummaries || []);
    const recommendation = inferRecommendedPack(workspaceContext, this.diagnostic);
    const relevantConfig = findRelevantConfigFile(workspaceContext, recommendation);
    if (fileMatch) {
      actions.push({
        command: 'rinawarp.openWorkspaceFile',
        label: `Open ${fileMatch.name}`,
        args: [fileMatch.path],
      });
    } else if (relevantConfig) {
      actions.push({
        command: 'rinawarp.openWorkspaceFile',
        label: `Inspect ${relevantConfig.name}`,
        args: [relevantConfig.path],
      });
    }
    if (workspaceContext.hasWorkspace) {
      actions.push({ command: 'rinawarp.runFreeDiagnostic', label: 'Run Free Diagnostic' });
    }
    if (/refresh|plan|entitlement|billing|connected/i.test(prompt) && this.snapshot.email) {
      actions.push({ command: 'rinawarp.refreshEntitlements', label: 'Refresh Entitlements' });
    }
    if (recommendation.pack) {
      actions.push({
        command: 'rinawarp.openPack',
        label: `Open ${recommendation.pack}`,
        args: [recommendation.pack, 'chat_local_tool'],
      });
    }
    actions.push({ command: 'rinawarp.openPacks', label: 'Open Packs' });
    if (this.snapshot.plan === 'free') {
      actions.push({ command: 'rinawarp.upgradeToPro', label: 'Upgrade to Pro' });
    }
    return actions;
  }

  private async restoreState(): Promise<void> {
    const raw = await this.context.secrets.get(CompanionChatProvider.STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { messages?: ChatMessage[]; stagedAction?: ChatAction };
      if (Array.isArray(parsed.messages)) {
        this.messages.splice(0, this.messages.length, ...parsed.messages.slice(-20));
      }
      if (parsed.stagedAction?.command && parsed.stagedAction?.label) {
        this.stagedAction = parsed.stagedAction;
      }
    } catch {
      // Ignore corrupted chat state and start fresh.
    }
  }

  private async persistState(): Promise<void> {
    await this.context.secrets.store(
      CompanionChatProvider.STORAGE_KEY,
      JSON.stringify({ messages: this.messages.slice(-20), stagedAction: this.stagedAction }),
    );
  }

  private renderHtml(webview: vscode.Webview): string {
    const nonce = String(Date.now());
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RinaWarp Chat</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: var(--vscode-sideBar-background);
        --border: var(--vscode-panel-border);
        --fg: var(--vscode-foreground);
        --muted: var(--vscode-descriptionForeground);
        --accent: var(--vscode-textLink-foreground);
        --button-bg: var(--vscode-button-background);
        --button-fg: var(--vscode-button-foreground);
        --button-secondary-bg: color-mix(in srgb, var(--button-bg) 20%, transparent);
        --user-bg: color-mix(in srgb, var(--button-bg) 18%, transparent);
        --assistant-bg: color-mix(in srgb, var(--accent) 10%, transparent);
        --hero-bg: color-mix(in srgb, var(--accent) 10%, var(--bg));
      }
      body {
        margin: 0;
        padding: 0;
        background: var(--bg);
        color: var(--fg);
        font: 13px/1.45 var(--vscode-font-family);
      }
      .app {
        display: grid;
        grid-template-rows: auto 1fr auto;
        height: 100vh;
      }
      .header {
        padding: 12px;
        border-bottom: 1px solid var(--border);
      }
      .title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .subtitle {
        color: var(--muted);
        font-size: 12px;
      }
      .messages {
        overflow: auto;
        padding: 12px;
        display: grid;
        gap: 10px;
        align-content: start;
      }
      .empty {
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 14px;
        color: var(--muted);
        background: linear-gradient(180deg, var(--hero-bg), transparent);
      }
      .empty-title {
        color: var(--fg);
        font-weight: 700;
        margin-bottom: 6px;
      }
      .empty-copy {
        margin-bottom: 10px;
      }
      .checklist {
        display: grid;
        gap: 6px;
        margin: 10px 0 2px;
      }
      .checklist-item {
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      .check {
        color: var(--accent);
        font-weight: 700;
      }
      .prompt-row, .action-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .chip, .action {
        border: 1px solid var(--border);
        border-radius: 999px;
        background: transparent;
        color: var(--fg);
        padding: 6px 10px;
        cursor: pointer;
      }
      .message {
        border-radius: 12px;
        padding: 10px 12px;
        border: 1px solid var(--border);
        white-space: pre-wrap;
      }
      .message.user { background: var(--user-bg); }
      .message.assistant { background: var(--assistant-bg); }
      .message.system { background: transparent; color: var(--muted); }
      .composer {
        border-top: 1px solid var(--border);
        padding: 12px;
        display: grid;
        gap: 8px;
      }
      textarea {
        width: 100%;
        min-height: 72px;
        resize: vertical;
        box-sizing: border-box;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border, var(--border));
        border-radius: 8px;
        padding: 10px;
        font: inherit;
      }
      .buttons {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      button.primary, button.secondary {
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        cursor: pointer;
        font: inherit;
      }
      button.primary {
        background: var(--button-bg);
        color: var(--button-fg);
      }
      button.secondary {
        background: var(--button-secondary-bg);
        color: var(--fg);
      }
      .status {
        color: var(--muted);
        font-size: 12px;
      }
      .error {
        color: #ff8f8f;
      }
    </style>
  </head>
  <body>
    <div class="app">
      <div class="header">
        <div class="title">Chat With Rina</div>
        <div class="subtitle" id="subtitle">Ask about diagnostics, packs, and next steps.</div>
      </div>
      <div class="messages" id="messages"></div>
      <div class="composer">
        <div class="status" id="status"></div>
        <textarea id="input" placeholder="Ask Rina what to do next..."></textarea>
        <div class="buttons">
          <button class="secondary" id="clear">Clear conversation</button>
          <button class="primary" id="send">Send</button>
        </div>
      </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const messagesEl = document.getElementById('messages');
      const inputEl = document.getElementById('input');
      const sendEl = document.getElementById('send');
      const clearEl = document.getElementById('clear');
      const statusEl = document.getElementById('status');
      const subtitleEl = document.getElementById('subtitle');

      let state = {
        diagnostic: undefined,
        isConnected: false,
        lastError: undefined,
        messages: [],
        nextActionLabel: undefined,
        pending: false,
        plan: 'free',
        prompts: [],
        starterActions: [],
      };

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function render() {
        subtitleEl.textContent = state.isConnected
          ? 'Ask about diagnostics, packs, and your next safe workflow.'
          : 'Connect your account to start chatting with Rina.';

        statusEl.className = 'status' + (state.lastError ? ' error' : '');
        if (state.lastError) {
          statusEl.textContent = state.lastError;
        } else if (state.pending) {
          statusEl.textContent = 'Rina is thinking...';
        } else if (state.nextActionLabel) {
          statusEl.textContent = 'Ready next action: ' + state.nextActionLabel + '. Say "do it" or click the action button.';
        } else if (state.diagnostic) {
          statusEl.textContent = 'Last diagnostic: ' + state.diagnostic.workspaceName + ' -> ' + state.diagnostic.recommendedPack;
        } else {
          statusEl.textContent = 'Plan: ' + String(state.plan).toUpperCase();
        }

        if (!state.messages.length) {
          const actions = (state.starterActions || []).map((action, actionIndex) =>
            '<button class="action" data-starter-action-index="' + actionIndex + '">' + escapeHtml(action.label) + '</button>'
          ).join('');
          const prompts = state.prompts.map((prompt) => '<button class="chip" data-prompt="' + escapeHtml(prompt) + '">' + escapeHtml(prompt) + '</button>').join('');
          const checklist = state.isConnected
            ? '<div class="checklist">' +
                '<div class="checklist-item"><span class="check">1.</span><span>Ask Rina what to do next in this workspace.</span></div>' +
                '<div class="checklist-item"><span class="check">2.</span><span>Run the free diagnostic for a concrete recommendation.</span></div>' +
                '<div class="checklist-item"><span class="check">3.</span><span>Open capability packs when you want the deeper workflow.</span></div>' +
              '</div>'
            : '<div class="checklist">' +
                '<div class="checklist-item"><span class="check">1.</span><span>Connect your RinaWarp account.</span></div>' +
                '<div class="checklist-item"><span class="check">2.</span><span>Return to VS Code and refresh entitlements if needed.</span></div>' +
                '<div class="checklist-item"><span class="check">3.</span><span>Come back here and ask Rina what to do next.</span></div>' +
              '</div>';
          messagesEl.innerHTML = '<div class="empty">' +
            '<div class="empty-title">' + (state.isConnected ? 'Start with the quickest safe next step' : 'Connect Companion and start cleanly') + '</div>' +
            '<div class="empty-copy">' +
              (state.isConnected
                ? 'Companion is ready. Use chat for direction, then diagnostics or packs when you want action.'
                : 'Chat opens up after account connect. Companion keeps account, diagnostic, and billing flows in one place.') +
            '</div>' +
            checklist +
            (actions ? '<div class="action-row">' + actions + '</div>' : '') +
            (prompts ? '<div class="prompt-row">' + prompts + '</div>' : '') +
            '</div>';
        } else {
          messagesEl.innerHTML = state.messages.map((message, index) => {
            const actions = Array.isArray(message.actions) && message.actions.length
              ? '<div class="action-row">' + message.actions.map((action, actionIndex) =>
                  '<button class="action" data-action-index="' + actionIndex + '" data-message-index="' + index + '">' + escapeHtml(action.label) + '</button>'
                ).join('') + '</div>'
              : '';
            return '<div class="message ' + escapeHtml(message.role) + '">' + escapeHtml(message.content) + actions + '</div>';
          }).join('');
        }

        sendEl.disabled = state.pending || !state.isConnected;
        inputEl.disabled = state.pending || !state.isConnected;
      }

      window.addEventListener('message', (event) => {
        const message = event.data;
        if (message?.type === 'state') {
          state = message.value;
          render();
        }
      });

      sendEl.addEventListener('click', () => {
        const text = inputEl.value.trim();
        if (!text) return;
        vscode.postMessage({ type: 'send', text });
        inputEl.value = '';
      });

      clearEl.addEventListener('click', () => {
        vscode.postMessage({ type: 'clear' });
      });

      inputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          sendEl.click();
        }
      });

      messagesEl.addEventListener('click', (event) => {
        const promptTarget = event.target.closest('[data-prompt]');
        if (promptTarget) {
          vscode.postMessage({ type: 'send', text: promptTarget.getAttribute('data-prompt') || '' });
          return;
        }

        const starterActionTarget = event.target.closest('[data-starter-action-index]');
        if (starterActionTarget) {
          const actionIndex = Number(starterActionTarget.getAttribute('data-starter-action-index'));
          const action = state.starterActions?.[actionIndex];
          if (action?.command) {
            vscode.postMessage({ type: 'action', command: action.command, args: action.args || [] });
          }
          return;
        }

        const actionTarget = event.target.closest('[data-action-index]');
        if (!actionTarget) return;
        const messageIndex = Number(actionTarget.getAttribute('data-message-index'));
        const actionIndex = Number(actionTarget.getAttribute('data-action-index'));
        const action = state.messages?.[messageIndex]?.actions?.[actionIndex];
        if (action?.command) {
          vscode.postMessage({ type: 'action', command: action.command, args: action.args || [] });
        }
      });

      vscode.postMessage({ type: 'ready' });
    </script>
  </body>
</html>`;
  }
}

export function isApprovalPrompt(text: string): boolean {
  return /\b(do it|go ahead|run it|open it|inspect it|yes do it|yes run it|continue|open that|inspect that|run that|refresh it|upgrade me)\b/i.test(text.trim());
}

export function isFixIntent(text: string): boolean {
  return /\b(fix|improve|clean up|repair|rewrite|refactor)\b/i.test(text);
}

export function pickPrimaryAction(actions: ChatAction[]): ChatAction | undefined {
  if (!actions.length) {
    return undefined;
  }

  const preferredOrder: ChatAction['command'][] = [
    'rinawarp.fixSelection',
    'rinawarp.fixFile',
    'rinawarp.openWorkspaceFile',
    'rinawarp.runFreeDiagnostic',
    'rinawarp.openPack',
    'rinawarp.openPacks',
    'rinawarp.upgradeToPro',
    'rinawarp.refreshEntitlements',
  ];

  for (const command of preferredOrder) {
    const match = actions.find((action) => action.command === command);
    if (match) return match;
  }

  return actions[0];
}

export function pickActionForPrompt(
  prompt: string,
  actions: ChatAction[],
  fallback?: ChatAction,
): ChatAction {
  const normalized = prompt.toLowerCase();
  const primary = fallback || pickPrimaryAction(actions);

  if (!primary) {
    throw new Error('No staged action is available right now.');
  }

  if (/\binspect|explain|show\b/.test(normalized)) {
    return actions.find((action) => action.command === 'rinawarp.openWorkspaceFile') || primary;
  }

  if (/\bfix selection|selected|this part\b/.test(normalized)) {
    return actions.find((action) => action.command === 'rinawarp.fixSelection') || primary;
  }

  if (/\bfix file|fix this file|repair file|rewrite file|improve file\b/.test(normalized)) {
    return actions.find((action) => action.command === 'rinawarp.fixFile') || primary;
  }

  if (/\bdiagnostic|diagnose|check|scan\b/.test(normalized)) {
    return actions.find((action) => action.command === 'rinawarp.runFreeDiagnostic') || primary;
  }

  if (/\bupgrade|pro|pay\b/.test(normalized)) {
    return actions.find((action) => action.command === 'rinawarp.upgradeToPro') || primary;
  }

  if (/\brefresh|reconnect|entitlement|plan\b/.test(normalized)) {
    return actions.find((action) => action.command === 'rinawarp.refreshEntitlements') || primary;
  }

  if (/\bpack|open|view\b/.test(normalized)) {
    return actions.find((action) => action.command === 'rinawarp.openPack')
      || actions.find((action) => action.command === 'rinawarp.openPacks')
      || primary;
  }

  return primary;
}
