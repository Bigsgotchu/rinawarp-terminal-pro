import * as vscode from 'vscode';

import { AuthUriHandler, getPurchaseReturnUri } from './auth';
import { CompanionChatApiClient } from './chatApi';
import { CompanionChatProvider } from './chat';
import { getConfig } from './config';
import { runWorkspaceDiagnostic } from './diagnostics';
import { EntitlementService, defaultSnapshot, type EntitlementSnapshot } from './entitlements';
import { runEntitlementRefresh } from './refreshFlow';
import {
  createBillingPortalUrl,
  createPackUrl,
  createPacksUrl,
  createPurchaseVerificationUrl,
  createPricingUrl,
  createPrivacyUrl,
} from './rinawarpUrls';
import { CompanionTreeProvider } from './sidebar';
import { setTelemetryService, TelemetryService } from './telemetry';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = vscode.window.createOutputChannel('RinaWarp Companion');
  const telemetry = new TelemetryService(output);
  setTelemetryService(telemetry);
  const entitlements = new EntitlementService(context);
  let snapshot = await entitlements.getSnapshot();
  if (!snapshot.updatedAt) {
    snapshot = defaultSnapshot();
  }

  const sidebar = new CompanionTreeProvider(snapshot);
  const chat = new CompanionChatProvider(context, context.extensionUri, snapshot, new CompanionChatApiClient(entitlements));
  context.subscriptions.push(vscode.window.registerTreeDataProvider('rinawarp.companion', sidebar));
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('rinawarp.chat', chat));

  const setSnapshot = (next: EntitlementSnapshot) => {
    snapshot = next;
    sidebar.update(next);
    chat.updateSnapshot(next);
  };

  const refreshEntitlements = async (
    source: 'manual' | 'auth-callback' | 'purchase-complete',
    fallbackSnapshot?: Partial<EntitlementSnapshot>,
  ) =>
    runEntitlementRefresh({
      source,
      entitlements,
      getSnapshot: () => snapshot,
      setSnapshot,
      output,
      fallbackSnapshot,
    });

  const authHandler = new AuthUriHandler(context, refreshEntitlements);
  context.subscriptions.push(vscode.window.registerUriHandler(authHandler));

  context.subscriptions.push(
    vscode.commands.registerCommand('rinawarp.connectAccount', async () => {
      telemetry.record({ name: 'connect_account_started' });
      const url = await authHandler.buildConnectUrl(getConfig().baseUrl);
      await vscode.env.openExternal(vscode.Uri.parse(url.toString()));
    }),
    vscode.commands.registerCommand('rinawarp.runFreeDiagnostic', async () => {
      if (!vscode.workspace.isTrusted) {
        void vscode.window.showWarningMessage(
          'RinaWarp free diagnostic is only available in a trusted workspace because proof-backed workflows can inspect local project state.',
        );
        return;
      }

      telemetry.record({ name: 'free_diagnostic_started' });
      try {
        const summary = await runWorkspaceDiagnostic(output);
        sidebar.updateDiagnostic(summary);
        chat.updateDiagnostic(summary);
        telemetry.record({
          name: 'proof_summary_viewed',
          properties: { pack: summary.recommendedPack, workspace: summary.workspaceName },
        });

        const openPacks = 'Open Packs';
        const openRecommendedPack = `View ${summary.recommendedPack}`;
        const upgrade = 'Upgrade to Pro';
        const choice = await vscode.window.showInformationMessage(
          `${summary.proofSummary}`,
          openRecommendedPack,
          openPacks,
          upgrade,
        );

        if (choice === openRecommendedPack) {
          await vscode.commands.executeCommand('rinawarp.openPack', summary.recommendedPack, 'diagnostic_summary');
        }

        if (choice === openPacks) {
          await vscode.commands.executeCommand('rinawarp.openPacks');
        }

        if (choice === upgrade && snapshot.plan === 'free') {
          await vscode.commands.executeCommand('rinawarp.upgradeToPro');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown diagnostic error';
        output.appendLine(`[error] ${message}`);
        void vscode.window.showWarningMessage(`RinaWarp could not complete the free diagnostic: ${message}`);
      }
    }),
    vscode.commands.registerCommand('rinawarp.openPacks', async () => {
      telemetry.record({ name: 'open_packs_clicked' });
      const url = createPacksUrl(getConfig().baseUrl, {
        campaign: 'rinawarp_vscode_launch_q2_2026',
        content: 'sidebar_open_packs',
      });
      await vscode.env.openExternal(vscode.Uri.parse(url.toString()));
    }),
    vscode.commands.registerCommand('rinawarp.openWorkspaceFile', async (filePathArg?: unknown) => {
      const filePath = typeof filePathArg === 'string' ? filePathArg : '';
      if (!filePath) {
        void vscode.window.showWarningMessage('RinaWarp could not open that file because no path was provided.');
        return;
      }

      try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        await vscode.window.showTextDocument(document, { preview: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown file open error';
        void vscode.window.showWarningMessage(`RinaWarp could not open that file: ${message}`);
      }
    }),
    vscode.commands.registerCommand('rinawarp.openPack', async (packArg?: unknown, placementArg?: unknown) => {
      const pack = typeof packArg === 'string' ? packArg : undefined;
      const placement = typeof placementArg === 'string' ? placementArg : 'command';

      if (!pack) {
        await vscode.commands.executeCommand('rinawarp.openPacks');
        return;
      }

      telemetry.record({ name: 'open_pack_clicked', properties: { pack, placement } });
      const url = createPackUrl(getConfig().baseUrl, pack, {
        campaign: 'rinawarp_vscode_launch_q2_2026',
        content: placement,
        term: pack,
      });
      await vscode.env.openExternal(vscode.Uri.parse(url.toString()));
    }),
    vscode.commands.registerCommand('rinawarp.upgradeToPro', async () => {
      telemetry.record({ name: 'upgrade_clicked', properties: { placement: 'command' } });
      const url = createPricingUrl(getConfig().baseUrl, {
        campaign: 'rinawarp_vscode_launch_q2_2026',
        content: 'paywall_upgrade_to_pro',
        term: 'proof_export',
      });
      url.searchParams.set('return_to', getPurchaseReturnUri().toString());
      await vscode.env.openExternal(vscode.Uri.parse(url.toString()));
    }),
    vscode.commands.registerCommand('rinawarp.verifyPurchaseReturn', async () => {
      telemetry.record({ name: 'purchase_return_verification_started' });
      const url = createPurchaseVerificationUrl(getConfig().baseUrl, {
        campaign: 'rinawarp_vscode_launch_q2_2026',
        content: 'verify_purchase_return',
      }, getPurchaseReturnUri().toString());
      await vscode.env.openExternal(vscode.Uri.parse(url.toString()));
    }),
    vscode.commands.registerCommand('rinawarp.openBillingPortal', async () => {
      telemetry.record({ name: 'billing_portal_clicked' });
      const url = createBillingPortalUrl(getConfig().baseUrl, {
        campaign: 'rinawarp_vscode_launch_q2_2026',
        content: 'account_billing_portal',
      });
      await vscode.env.openExternal(vscode.Uri.parse(url.toString()));
    }),
    vscode.commands.registerCommand('rinawarp.refreshEntitlements', async () => {
      telemetry.record({ name: 'refresh_entitlements_started' });
      const result = await refreshEntitlements('manual');
      if (result.severity === 'warning') {
        void vscode.window.showWarningMessage(result.toastMessage);
      } else {
        void vscode.window.showInformationMessage(result.toastMessage);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('rinawarp.openPrivacy', async () => {
      const url = createPrivacyUrl(getConfig().baseUrl, {
        campaign: 'rinawarp_vscode_launch_q2_2026',
        content: 'walkthrough_privacy',
      });
      await vscode.env.openExternal(vscode.Uri.parse(url.toString()));
    }),
  );

  telemetry.record({ name: 'extension_activated', properties: { plan: snapshot.plan } });
}

export function deactivate(): void {}
