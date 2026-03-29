import * as vscode from 'vscode';

export interface RinaWarpConfig {
  apiBaseUrl: string;
  baseUrl: string;
  enableTelemetry: boolean;
}

export function getConfig(): RinaWarpConfig {
  const config = vscode.workspace.getConfiguration('rinawarp');
  return {
    apiBaseUrl: trimTrailingSlash(config.get<string>('apiBaseUrl', 'https://api.rinawarptech.com')),
    baseUrl: trimTrailingSlash(config.get<string>('baseUrl', 'https://rinawarptech.com')),
    enableTelemetry: config.get<boolean>('enableTelemetry', true),
  };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
