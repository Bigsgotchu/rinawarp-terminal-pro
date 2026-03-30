import * as vscode from 'vscode';

export function summarizeActiveEditor(editor: vscode.TextEditor): string {
  const document = editor.document;
  const text = document.getText();
  const lines = text.split(/\r?\n/);
  const lineCount = lines.length;
  const trimmed = text.trim();
  const preview = trimmed.slice(0, 400);
  const languageId = document.languageId;

  const functionMatches = text.match(/\bfunction\b|\=\s*\(/g) || [];
  const classMatches = text.match(/\bclass\b/g) || [];
  const exportMatches = text.match(/\bexport\b/g) || [];
  const todoMatches = text.match(/\bTODO\b|\bFIXME\b/g) || [];

  const signals = [
    functionMatches.length ? `${functionMatches.length} function tokens` : undefined,
    classMatches.length ? `${classMatches.length} class tokens` : undefined,
    exportMatches.length ? `${exportMatches.length} export tokens` : undefined,
    todoMatches.length ? `${todoMatches.length} TODO/FIXME` : undefined,
  ].filter(Boolean);

  return [
    'Decision card',
    `Active file: ${document.uri.fsPath}`,
    `Language: ${languageId}`,
    `Lines: ${lineCount}`,
    signals.length ? `Signals: ${signals.join(', ')}.` : 'No obvious structural signals detected.',
    preview ? `Preview: ${preview}` : 'The file is currently empty.',
  ].join('\n\n');
}
