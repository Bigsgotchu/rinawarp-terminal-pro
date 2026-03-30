import * as vscode from 'vscode';

import { EntitlementService, type EntitlementSnapshot } from './entitlements';
import { createLoginUrl } from './rinawarpUrls';
import { recordTelemetry } from './telemetry';

const AUTH_CALLBACK_PATH = '/auth/callback';
const PURCHASE_COMPLETE_PATH = '/purchase-complete';

export class AuthUriHandler implements vscode.UriHandler {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly entitlements: EntitlementService,
    private readonly onEntitlementChanged: (snapshot: EntitlementSnapshot) => void,
  ) {}

  async handleUri(uri: vscode.Uri): Promise<void> {
    if (uri.path === PURCHASE_COMPLETE_PATH) {
      recordTelemetry({ name: 'purchase_returned' });
      try {
        const snapshot = await this.entitlements.refreshFromApi();
        this.onEntitlementChanged(snapshot);
        void vscode.window.showInformationMessage(`RinaWarp purchase confirmed. Plan: ${snapshot.plan.toUpperCase()}.`);
      } catch {
        void vscode.window.showInformationMessage(
          'RinaWarp purchase completed. Use "RinaWarp: Refresh Entitlements" if your new plan does not appear yet.',
        );
      }
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

    await this.entitlements.setSessionToken(token);
    try {
      const snapshot = await this.entitlements.refreshFromApi();
      this.onEntitlementChanged(snapshot);
      void vscode.window.showInformationMessage(`RinaWarp connected. Plan: ${snapshot.plan.toUpperCase()}.`);
      return;
    } catch {
      const snapshot: EntitlementSnapshot = {
        email: params.get('email') ?? undefined,
        plan: normalizePlan(params.get('plan')),
        packs: params.getAll('pack'),
        updatedAt: new Date().toISOString(),
      };
      await this.entitlements.setSnapshot(snapshot);
      this.onEntitlementChanged(snapshot);

      if (snapshot.email) {
        void vscode.window.showInformationMessage(`RinaWarp connected. Plan: ${snapshot.plan.toUpperCase()}.`);
      } else {
        void vscode.window.showWarningMessage(
          'RinaWarp received the login callback, but account details could not be restored yet. Run "RinaWarp: Refresh Entitlements".',
        );
      }
    }
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

function normalizePlan(value: string | null): 'free' | 'pro' | 'team' {
  if (value === 'pro' || value === 'team') {
    return value;
  }
  return 'free';
}
