import * as vscode from 'vscode';

import type { DiagnosticRunSummary } from './diagnostics';
import type { EntitlementSnapshot } from './entitlements';

export class CompanionTreeProvider implements vscode.TreeDataProvider<CompanionItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<CompanionItem | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(
    private snapshot: EntitlementSnapshot,
    private diagnostic?: DiagnosticRunSummary,
  ) {}

  update(snapshot: EntitlementSnapshot): void {
    this.snapshot = snapshot;
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  updateDiagnostic(summary: DiagnosticRunSummary): void {
    this.diagnostic = summary;
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: CompanionItem): vscode.TreeItem {
    return element;
  }

  getChildren(): CompanionItem[] {
    const items: CompanionItem[] = [
      ...this.createGettingStartedItems(),
      new CompanionItem('plan', `Plan: ${this.snapshot.plan.toUpperCase()}`, vscode.TreeItemCollapsibleState.None, undefined, undefined, {
        description: this.snapshot.plan === 'free' ? 'Preview access' : 'Account active',
        iconPath: new vscode.ThemeIcon('star-full'),
        tooltip: 'Your current RinaWarp plan inside Companion.',
      }),
      new CompanionItem(
        'account',
        this.snapshot.email ? `Account: ${this.snapshot.email}` : 'Account: not connected',
        vscode.TreeItemCollapsibleState.None,
        this.snapshot.email ? undefined : 'rinawarp.connectAccount',
        undefined,
        {
          description: this.snapshot.email ? 'Connected' : 'Start here',
          iconPath: new vscode.ThemeIcon('account'),
          tooltip: this.snapshot.email
            ? 'Companion is connected to your RinaWarp account.'
            : 'Connect your account to unlock chat, plan refresh, and billing-aware flows.',
        },
      ),
      this.createRefreshStatusItem(),
      new CompanionItem(
        'open-chat',
        'Open Chat With Rina',
        vscode.TreeItemCollapsibleState.None,
        'rinawarp.openChat',
        undefined,
        {
          description: this.snapshot.email ? 'Ask what to do next' : 'Available after connect',
          iconPath: new vscode.ThemeIcon('comment-discussion'),
          tooltip: 'Open the chat-first Companion surface in VS Code.',
        },
      ),
      new CompanionItem(
        'run-free-diagnostic',
        'Run Free Diagnostic',
        vscode.TreeItemCollapsibleState.None,
        'rinawarp.runFreeDiagnostic',
        undefined,
        {
          description: this.diagnostic ? 'Run again' : 'First proof-backed step',
          iconPath: new vscode.ThemeIcon('beaker'),
          tooltip: 'Inspect the current workspace and get a concrete recommended next step.',
        },
      ),
      new CompanionItem(
        'open-capability-packs',
        'Open Capability Packs',
        vscode.TreeItemCollapsibleState.None,
        'rinawarp.openPacks',
        undefined,
        {
          description: 'Deployment, audit, and recovery',
          iconPath: new vscode.ThemeIcon('library'),
          tooltip: 'Browse the live RinaWarp capability catalog.',
        },
      ),
    ];

    if (this.snapshot.plan === 'free') {
      items.push(
        new CompanionItem('upgrade-to-pro', 'Upgrade to Pro', vscode.TreeItemCollapsibleState.None, 'rinawarp.upgradeToPro', undefined, {
          description: 'Unlock paid capabilities',
          iconPath: new vscode.ThemeIcon('rocket'),
          tooltip: 'Open pricing and upgrade from the shared RinaWarp account flow.',
        }),
      );
    } else {
      items.push(
        new CompanionItem('open-billing-portal', 'Open Billing Portal', vscode.TreeItemCollapsibleState.None, 'rinawarp.openBillingPortal', undefined, {
          description: 'Manage plan and receipts',
          iconPath: new vscode.ThemeIcon('credit-card'),
          tooltip: 'Open the hosted billing surface for the connected account.',
        }),
      );
    }

    if (this.diagnostic) {
      items.push(
        new CompanionItem('last-diagnostic', `Last diagnostic: ${this.diagnostic.workspaceName}`, vscode.TreeItemCollapsibleState.None, undefined, undefined, {
          description: this.diagnostic.recommendedPack,
          iconPath: new vscode.ThemeIcon('pulse'),
          tooltip: this.diagnostic.proofSummary,
        }),
      );
      items.push(
        new CompanionItem(
          `recommended-pack:${this.diagnostic.recommendedPack}`,
          `Suggested pack: ${this.diagnostic.recommendedPack}`,
          vscode.TreeItemCollapsibleState.None,
          'rinawarp.openPack',
          [this.diagnostic.recommendedPack, 'sidebar_recommended_pack'],
          {
            description: 'Recommended next',
            iconPath: new vscode.ThemeIcon('sparkle'),
            tooltip: this.diagnostic.recommendedReason,
          },
        ),
      );
    }

    for (const pack of this.snapshot.packs.slice(0, 5)) {
      items.push(
        new CompanionItem(`pack:${pack}`, `Pack: ${pack}`, vscode.TreeItemCollapsibleState.None, 'rinawarp.openPack', [pack, 'sidebar_pack'], {
          description: 'Enabled',
          iconPath: new vscode.ThemeIcon('checklist'),
          tooltip: `Open the ${pack} capability page.`,
        }),
      );
    }

    return items;
  }

  private createGettingStartedItems(): CompanionItem[] {
    if (!this.snapshot.email) {
      return [
        new CompanionItem('start-here', 'Start Here: Connect Account', vscode.TreeItemCollapsibleState.None, 'rinawarp.connectAccount', undefined, {
          description: 'Unlock chat and billing-aware flows',
          iconPath: new vscode.ThemeIcon('play-circle'),
          tooltip: 'First-run step: connect your RinaWarp account.',
        }),
        new CompanionItem('open-getting-started', 'Open Getting Started', vscode.TreeItemCollapsibleState.None, 'rinawarp.openGettingStarted', undefined, {
          description: 'Walkthrough and launch checklist',
          iconPath: new vscode.ThemeIcon('book'),
          tooltip: 'Open the built-in walkthrough for Companion.',
        }),
      ];
    }

    if (!this.diagnostic) {
      return [
        new CompanionItem('start-here', 'Start Here: Ask Rina Or Run A Diagnostic', vscode.TreeItemCollapsibleState.None, 'rinawarp.openChat', undefined, {
          description: 'Best next step for first value',
          iconPath: new vscode.ThemeIcon('play-circle'),
          tooltip: 'Open chat, ask what to do next, or run the free diagnostic from the sidebar.',
        }),
      ];
    }

    return [];
  }

  private createRefreshStatusItem(): CompanionItem {
    if (this.snapshot.refreshStatus === 'refreshing') {
      return new CompanionItem('refresh-status', 'Entitlements: refreshing...', vscode.TreeItemCollapsibleState.None, undefined, undefined, {
        description: 'Checking plan state',
        iconPath: new vscode.ThemeIcon('sync~spin'),
        tooltip: 'Companion is refreshing your account entitlements.',
      });
    }

    if (this.snapshot.refreshStatus === 'failed') {
      const label = this.snapshot.lastRefreshError
        ? `Entitlements: stale. ${this.snapshot.lastRefreshError}`
        : 'Entitlements: stale. Retry refresh.';
      return new CompanionItem('refresh-status', label, vscode.TreeItemCollapsibleState.None, 'rinawarp.refreshEntitlements', undefined, {
        description: 'Retry available',
        iconPath: new vscode.ThemeIcon('warning'),
        tooltip: 'The last refresh failed, but your previous account state was preserved.',
      });
    }

    if (this.snapshot.lastRefreshAttemptAt) {
      return new CompanionItem('refresh-status', 'Entitlements: current', vscode.TreeItemCollapsibleState.None, 'rinawarp.refreshEntitlements', undefined, {
        description: 'Click to recheck',
        iconPath: new vscode.ThemeIcon('pass'),
        tooltip: 'Your entitlement snapshot is current. Click to refresh again.',
      });
    }

    return new CompanionItem('refresh-status', 'Refresh Entitlements', vscode.TreeItemCollapsibleState.None, 'rinawarp.refreshEntitlements', undefined, {
      description: 'Check plan state',
      iconPath: new vscode.ThemeIcon('refresh'),
      tooltip: 'Refresh your plan and pack access from the RinaWarp account service.',
    });
  }
}

class CompanionItem extends vscode.TreeItem {
  constructor(
    id: string,
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    command?: string,
    args?: unknown[],
    options?: {
      description?: string;
      iconPath?: vscode.ThemeIcon;
      tooltip?: string;
    },
  ) {
    super(label, collapsibleState);
    Object.assign(this, { id });
    this.description = options?.description;
    this.iconPath = options?.iconPath;
    this.tooltip = options?.tooltip;
    if (command) {
      this.command = {
        command,
        title: label,
        arguments: args,
      };
    }
  }
}
