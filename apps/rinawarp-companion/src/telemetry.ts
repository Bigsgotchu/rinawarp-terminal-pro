import * as vscode from 'vscode';

import { getConfig } from './config';

export interface TelemetryEvent {
  name: string;
  properties?: Record<string, string>;
}

export class TelemetryService {
  constructor(private readonly output: vscode.OutputChannel) {}

  record(event: TelemetryEvent): void {
    const config = getConfig();
    if (!config.enableTelemetry || !vscode.env.isTelemetryEnabled) {
      return;
    }

    const timestamp = new Date().toISOString();
    const details = event.properties ? ` ${JSON.stringify(event.properties)}` : '';
    this.output.appendLine(`[telemetry] ${timestamp} ${event.name}${details}`);
  }
}

let singletonTelemetry: TelemetryService | undefined;

export function setTelemetryService(service: TelemetryService): void {
  singletonTelemetry = service;
}

export function recordTelemetry(event: TelemetryEvent): void {
  singletonTelemetry?.record(event);
}
