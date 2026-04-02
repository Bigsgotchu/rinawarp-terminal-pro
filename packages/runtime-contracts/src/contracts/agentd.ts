export interface AgentdHeadersOptions {
  readonly includeLicenseToken?: boolean;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface AgentdRequestInit {
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly includeLicenseToken?: boolean;
}

export interface AgentdClient {
  buildHeaders(options?: AgentdHeadersOptions): Record<string, string>;
  json(path: string, init: AgentdRequestInit): Promise<unknown>;
}
