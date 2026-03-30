import * as vscode from 'vscode';

import { getConfig } from './config';
import type { EntitlementService } from './entitlements';

export interface InlineCompletionRequest {
  filePath: string;
  languageId: string;
  textAfterCursor: string;
  textBeforeCursor: string;
}

export class CompanionInlineCompletionClient {
  constructor(private readonly entitlements: EntitlementService) {}

  async getInlineCompletion(request: InlineCompletionRequest): Promise<string | null> {
    const token = await this.entitlements.getSessionToken();
    if (!token) {
      return null;
    }

    const config = getConfig();
    const response = await fetch(`${config.apiBaseUrl}/api/ai/inline`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        after: request.textAfterCursor,
        before: request.textBeforeCursor,
        filePath: request.filePath,
        languageId: request.languageId,
      }),
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Inline completion request failed with status ${response.status}.`);
    }

    const data = (await response.json()) as { completion?: string };
    const completion = typeof data.completion === 'string' ? data.completion : '';
    return completion.trim() ? completion : null;
  }
}

export class CompanionInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
  constructor(private readonly client: CompanionInlineCompletionClient) {}

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlineCompletionItem[] | null> {
    if (token.isCancellationRequested) {
      return null;
    }

    const fullText = document.getText();
    const offset = document.offsetAt(position);
    const completion = await this.client.getInlineCompletion({
      filePath: document.uri.fsPath,
      languageId: document.languageId,
      textAfterCursor: fullText.slice(offset),
      textBeforeCursor: fullText.slice(0, offset),
    });

    if (!completion) {
      return null;
    }

    return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
  }
}
