import * as vscode from 'vscode';

import { getConfig } from './config';
import type { EntitlementService } from './entitlements';

export interface FixCodeRequest {
  filePath: string;
  instructions: string;
  languageId: string;
  mode: 'file' | 'selection';
  originalCode: string;
}

export interface FixCodeResponse {
  fixedCode: string;
  summary: string;
}

export class CompanionFixClient {
  constructor(private readonly entitlements: EntitlementService) {}

  async fixCode(request: FixCodeRequest): Promise<FixCodeResponse> {
    const token = await this.entitlements.getSessionToken();
    const config = getConfig();
    const response = await fetch(`${config.apiBaseUrl}/api/ai/fix`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: request.originalCode,
        filePath: request.filePath,
        instructions: request.instructions,
        languageId: request.languageId,
        mode: request.mode,
      }),
    });

    if (response.status === 401) {
      throw new Error('Your RinaWarp session expired. Reconnect your account and try again.');
    }

    if (!response.ok) {
      throw new Error(`Fix request failed with status ${response.status}.`);
    }

    const data = (await response.json()) as { fixed?: string; summary?: string };
    const fixedCode = typeof data.fixed === 'string' ? data.fixed.trim() : '';
    if (!fixedCode) {
      throw new Error('Rina did not return any fixed code.');
    }

    return {
      fixedCode,
      summary:
        typeof data.summary === 'string' && data.summary.trim()
          ? data.summary.trim()
          : request.mode === 'selection'
            ? 'Selection updated by Rina.'
            : 'File updated by Rina.',
    };
  }
}

export function hasActiveSelection(editor: vscode.TextEditor | undefined): boolean {
  if (!editor) {
    return false;
  }
  return !editor.selection.isEmpty;
}
