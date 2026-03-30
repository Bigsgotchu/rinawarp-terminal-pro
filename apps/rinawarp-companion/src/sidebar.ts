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
      new CompanionItem('plan', `Plan: ${this.snapshot.plan.toUpperCase()}`, vscode.TreeItemCollapsibleState.None),
      new CompanionItem(
        'account',
        this.snapshot.email ? `Account: ${this.snapshot.email}` : 'Account: not connected',
        vscode.TreeItemCollapsibleState.None,
        this.snapshot.email ? undefined : 'rinawarp.connectAccount',
      ),
      this.createRefreshStatusItem(),
      new CompanionItem('run-free-diagnostic', 'Run Free Diagnostic', vscode.TreeItemCollapsibleState.None, 'rinawarp.runFreeDiagnostic'),
      new CompanionItem('open-capability-packs', 'Open Capability Packs', vscode.TreeItemCollapsibleState.None, 'rinawarp.openPacks'),
    ];

    if (this.snapshot.plan === 'free') {
      items.push(new CompanionItem('upgrade-to-pro', 'Upgrade to Pro', vscode.TreeItemCollapsibleState.None, 'rinawarp.upgradeToPro'));
    } else {
      items.push(new CompanionItem('open-billing-portal', 'Open Billing Portal', vscode.TreeItemCollapsibleState.None, 'rinawarp.openBillingPortal'));
    }

    if (this.diagnostic) {
      items.push(new CompanionItem('last-diagnostic', `Last diagnostic: ${this.diagnostic.workspaceName}`, vscode.TreeItemCollapsibleState.None));
      items.push(
        new CompanionItem(
          `recommended-pack:${this.diagnostic.recommendedPack}`,
          `Suggested pack: ${this.diagnostic.recommendedPack}`,
          vscode.TreeItemCollapsibleState.None,
          'rinawarp.openPack',
          [this.diagnostic.recommendedPack, 'sidebar_recommended_pack'],
        ),
      );
    }

    for (const pack of this.snapshot.packs.slice(0, 5)) {
      items.push(new CompanionItem(`pack:${pack}`, `Pack: ${pack}`, vscode.TreeItemCollapsibleState.None, 'rinawarp.openPack', [pack, 'sidebar_pack']));
    }

    return items;
  }

  private createRefreshStatusItem(): CompanionItem {
    if (this.snapshot.refreshStatus === 'refreshing') {
      return new CompanionItem('refresh-status', 'Entitlements: refreshing...', vscode.TreeItemCollapsibleState.None);
    }

    if (this.snapshot.refreshStatus === 'failed') {
      const label = this.snapshot.lastRefreshError
        ? `Entitlements: stale. ${this.snapshot.lastRefreshError}`
        : 'Entitlements: stale. Retry refresh.';
      return new CompanionItem('refresh-status', label, vscode.TreeItemCollapsibleState.None, 'rinawarp.refreshEntitlements');
    }

    if (this.snapshot.lastRefreshAttemptAt) {
      return new CompanionItem('refresh-status', 'Entitlements: current', vscode.TreeItemCollapsibleState.None, 'rinawarp.refreshEntitlements');
    }

    return new CompanionItem('refresh-status', 'Refresh Entitlements', vscode.TreeItemCollapsibleState.None, 'rinawarp.refreshEntitlements');
  }
}

class CompanionItem extends vscode.TreeItem {
  constructor(id: string, label: string, collapsibleState: vscode.TreeItemCollapsibleState, command?: string, args?: unknown[]) {
    super(label, collapsibleState);
    Object.assign(this, { id });
    if (command) {
      this.command = {
        command,
        title: label,
        arguments: args,
      };
    }
  }
}
