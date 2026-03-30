import * as vscode from 'vscode';

import { AuthUriHandler, getPurchaseReturnUri, PUBLISHED_EXTENSION_ID } from './auth';
import { CompanionChatApiClient } from './chatApi';
import { CompanionChatProvider } from './chat';
import { getConfig } from './config';
import { runWorkspaceDiagnostic, type DiagnosticRunSummary } from './diagnostics';
import { EntitlementService, defaultSnapshot, type EntitlementSnapshot } from './entitlements';
import { summarizeActiveEditor } from './fileSummary';
import { CompanionFixClient } from './fixCode';
import { CompanionInlineCompletionClient, CompanionInlineCompletionProvider } from './inlineCompletion';
import { runEntitlementRefresh } from './refreshFlow';
import { answerWorkspaceQuestion, gatherWorkspaceContext } from './workspaceContext';
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
  const fixClient = new CompanionFixClient(entitlements);
  const inlineCompletionClient = new CompanionInlineCompletionClient(entitlements);
  let snapshot = await entitlements.getSnapshot();
  let diagnosticSummary: DiagnosticRunSummary | undefined;
  if (!snapshot.updatedAt) {
    snapshot = defaultSnapshot();
  }

  const sidebar = new CompanionTreeProvider(snapshot);
  const chat = new CompanionChatProvider(context, context.extensionUri, snapshot, new CompanionChatApiClient(entitlements));
  context.subscriptions.push(vscode.window.registerTreeDataProvider('rinawarp.companion', sidebar));
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('rinawarp.chat', chat));
  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
      { scheme: 'file' },
      new CompanionInlineCompletionProvider(inlineCompletionClient),
    ),
  );

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
    vscode.commands.registerCommand('rinawarp.openChat', async () => {
      telemetry.record({ name: 'open_chat_clicked', properties: { placement: 'command' } });
      await vscode.commands.executeCommand('workbench.view.extension.rinawarp');
      try {
        await vscode.commands.executeCommand('rinawarp.chat.focus');
      } catch {
        // Best effort: surfacing the RinaWarp container is still useful if the generated focus command is unavailable.
      }
    }),
    vscode.commands.registerCommand('rinawarp.openGettingStarted', async () => {
      telemetry.record({ name: 'open_getting_started_clicked' });
      await vscode.commands.executeCommand(
        'workbench.action.openWalkthrough',
        `${PUBLISHED_EXTENSION_ID}#rinawarp.gettingStarted`,
        false,
      );
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
        diagnosticSummary = summary;
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
    vscode.commands.registerCommand('rinawarp.summarizeWorkspace', async () => {
      const workspaceContext = await gatherWorkspaceContext();
      if (!workspaceContext.hasWorkspace) {
        chat.appendSystemMessage('Open a workspace folder first so I can summarize it.');
        return;
      }
      telemetry.record({ name: 'summarize_workspace_requested' });
      const summary = await answerWorkspaceQuestion('summarize this repo', workspaceContext, diagnosticSummary);
      chat.appendAssistantMessage(summary, [
        { command: 'rinawarp.runFreeDiagnostic', label: 'Run Free Diagnostic' },
        { command: 'rinawarp.openPacks', label: 'Open Capability Packs' },
      ]);
    }),
    vscode.commands.registerCommand('rinawarp.summarizeActiveFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        const choice = await vscode.window.showInformationMessage('Open a file first so I can summarize it.', 'Open File');
        if (choice === 'Open File') {
          await vscode.commands.executeCommand('workbench.action.files.openFile');
        }
        return;
      }
      telemetry.record({ name: 'summarize_file_requested' });
      const summary = summarizeActiveEditor(editor);
      chat.appendAssistantMessage(summary, [
        { command: 'rinawarp.fixSelection', label: 'Fix Selection' },
        { command: 'rinawarp.fixFile', label: 'Fix File' },
      ]);
    }),
    vscode.commands.registerCommand('rinawarp.fixFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        const choice = await vscode.window.showInformationMessage('Open a file first so Rina can fix it.', 'Open File');
        if (choice === 'Open File') {
          await vscode.commands.executeCommand('workbench.action.files.openFile');
        }
        return;
      }

      telemetry.record({ name: 'fix_file_started' });
      const document = editor.document;
      const originalCode = document.getText();
      if (!originalCode.trim()) {
        void vscode.window.showWarningMessage('This file is empty, so there is nothing for Rina to fix yet.');
        return;
      }

      try {
        const result = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Rina is fixing this file',
          },
          () =>
            fixClient.fixCode({
              filePath: document.uri.fsPath,
              instructions: `Improve this ${document.languageId} file. Return only the updated code.`,
              languageId: document.languageId,
              mode: 'file',
              originalCode,
            }),
        );

        if (result.fixedCode.trim() === originalCode.trim()) {
          void vscode.window.showInformationMessage('Rina looked at the file and did not suggest a meaningful change.');
          return;
        }

        const outcome = await confirmAndApplyFix({
          label: 'this file',
          original: originalCode,
          updated: result.fixedCode,
          languageId: document.languageId,
          apply: async () => {
            await editor.edit((editBuilder) => {
              const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(originalCode.length));
              editBuilder.replace(fullRange, result.fixedCode);
            });
          },
        });

        if (outcome === 'applied') {
          telemetry.record({ name: 'fix_file_completed' });
          void vscode.window.showInformationMessage(result.summary);
        } else if (outcome === 'cancelled') {
          void vscode.window.showInformationMessage('Left the original file unchanged.');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown fix error';
        output.appendLine(`[fix-file] ${message}`);
        telemetry.record({ name: 'fix_file_failed' });
        void vscode.window.showWarningMessage(`Rina could not fix this file: ${message}`);
      }
    }),
    vscode.commands.registerCommand('rinawarp.fixSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        const choice = await vscode.window.showInformationMessage('Open a file and select code first so Rina can help.', 'Open File');
        if (choice === 'Open File') {
          await vscode.commands.executeCommand('workbench.action.files.openFile');
        }
        return;
      }

      if (editor.selection.isEmpty) {
        void vscode.window.showWarningMessage('Select the code you want Rina to fix first.');
        return;
      }

      telemetry.record({ name: 'fix_selection_started' });
      const originalCode = editor.document.getText(editor.selection);
      try {
        const result = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Rina is fixing your selection',
          },
          () =>
            fixClient.fixCode({
              filePath: editor.document.uri.fsPath,
              instructions: `Improve this ${editor.document.languageId} code selection. Return only the updated code.`,
              languageId: editor.document.languageId,
              mode: 'selection',
              originalCode,
            }),
        );

        if (result.fixedCode.trim() === originalCode.trim()) {
          void vscode.window.showInformationMessage('Rina looked at the selection and did not suggest a meaningful change.');
          return;
        }

        const outcome = await confirmAndApplyFix({
          label: 'your selection',
          original: originalCode,
          updated: result.fixedCode,
          languageId: editor.document.languageId,
          apply: async () => {
            await editor.edit((editBuilder) => {
              editBuilder.replace(editor.selection, result.fixedCode);
            });
          },
        });

        if (outcome === 'applied') {
          telemetry.record({ name: 'fix_selection_completed' });
          void vscode.window.showInformationMessage(result.summary);
        } else if (outcome === 'cancelled') {
          void vscode.window.showInformationMessage('Left the original selection unchanged.');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown fix error';
        output.appendLine(`[fix-selection] ${message}`);
        telemetry.record({ name: 'fix_selection_failed' });
        void vscode.window.showWarningMessage(`Rina could not fix that selection: ${message}`);
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

async function confirmAndApplyFix(input: {
  label: string;
  original: string;
  updated: string;
  languageId: string;
  apply: () => Promise<void>;
}): Promise<'applied' | 'cancelled'> {
  const prompt = `Rina has a patch ready for ${input.label}.`;
  // Offer preview without forcing a blocking flow.
  while (true) {
    const choice = await vscode.window.showInformationMessage(prompt, 'Apply', 'View Diff', 'Cancel');
    if (choice === 'View Diff') {
      await openDiffPreview(input);
      continue;
    }
    if (choice === 'Apply') {
      await input.apply();
      return 'applied';
    }
    return 'cancelled';
  }
}

async function openDiffPreview(input: {
  label: string;
  original: string;
  updated: string;
  languageId: string;
}): Promise<void> {
  const left = await vscode.workspace.openTextDocument({
    language: input.languageId,
    content: input.original,
  });
  const right = await vscode.workspace.openTextDocument({
    language: input.languageId,
    content: input.updated,
  });
  await vscode.commands.executeCommand('vscode.diff', left.uri, right.uri, `Rina patch preview: ${input.label}`);
}
