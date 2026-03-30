import * as vscode from 'vscode';

import type { EntitlementSnapshot } from './entitlements';
import type { EntitlementRefreshResult } from './refreshFlow';
import { createLoginUrl } from './rinawarpUrls';
import { recordTelemetry } from './telemetry';

const AUTH_CALLBACK_PATH = '/auth/callback';
const PURCHASE_COMPLETE_PATH = '/purchase-complete';

export class AuthUriHandler implements vscode.UriHandler {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly refreshEntitlements: (
      source: 'auth-callback' | 'purchase-complete',
      fallbackSnapshot?: Partial<EntitlementSnapshot>,
    ) => Promise<EntitlementRefreshResult>,
  ) {}

  async handleUri(uri: vscode.Uri): Promise<void> {
    if (uri.path === PURCHASE_COMPLETE_PATH) {
      recordTelemetry({ name: 'purchase_returned' });
      const output = vscode.window.createOutputChannel('RinaWarp Companion');
      output.appendLine('[info] purchase-complete callback received');
      const result = await this.refreshEntitlements('purchase-complete');
      showRefreshResult(result);
      return;
    }

    if (uri.path !== AUTH_CALLBACK_PATH) {
      return;
    }

    const params = new URLSearchParams(uri.query);
    const token = params.get('token');
    if (!token) {
      void vscode.window.showWarningMessage('RinaWarp callback was missing a session token.');
      return;
    }

    const plan = params.get('plan');
    const packs = params.getAll('pack');
    const snapshot: Partial<EntitlementSnapshot> = {
      email: params.get('email') ?? undefined,
      plan: plan ? normalizePlan(plan) : undefined,
      packs: packs.length ? packs : undefined,
      updatedAt: new Date().toISOString(),
    };

    const secrets = this.context.secrets;
    await secrets.store('rinawarp.sessionToken', token);

    const result = await this.refreshEntitlements('auth-callback', snapshot);
    showRefreshResult(result);
  }

  async buildConnectUrl(baseUrl: string): Promise<URL> {
    const callbackUri = await vscode.env.asExternalUri(
      vscode.Uri.parse(`${vscode.env.uriScheme}://rinawarp.rinawarp-companion${AUTH_CALLBACK_PATH}`),
    );

    return createLoginUrl(baseUrl, {
      campaign: 'rinawarp_vscode_launch_q2_2026',
      content: 'walkthrough_connect_account',
    }, callbackUri.toString());
  }
}

export function getPurchaseReturnUri(): vscode.Uri {
  return vscode.Uri.parse(`${vscode.env.uriScheme}://rinawarp.rinawarp-companion${PURCHASE_COMPLETE_PATH}`);
}

function showRefreshResult(result: EntitlementRefreshResult): void {
  if (result.severity === 'warning') {
    void vscode.window.showWarningMessage(result.toastMessage);
    return;
  }

  void vscode.window.showInformationMessage(result.toastMessage);
}

function normalizePlan(value: string | null): 'free' | 'pro' | 'team' {
  if (value === 'pro' || value === 'team') {
    return value;
  }
  return 'free';
}
