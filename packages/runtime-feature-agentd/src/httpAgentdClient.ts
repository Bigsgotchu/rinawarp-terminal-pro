import type {
  AgentdClient,
  AgentdHeadersOptions,
  AgentdRequestInit,
  LicensingService,
} from "../../runtime-contracts/dist/index.js";

export interface HttpAgentdClientConfig {
  readonly baseUrl: string;
  readonly authToken: string;
  readonly fetchImpl: typeof fetch;
}

export class HttpAgentdClient implements AgentdClient {
  constructor(
    private readonly config: HttpAgentdClientConfig,
    private readonly licensing: LicensingService,
  ) {}

  buildHeaders(options?: AgentdHeadersOptions): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(options?.headers ?? {}),
    };

    if (this.config.authToken) {
      headers.authorization = `Bearer ${this.config.authToken}`;
    }

    const snapshot = this.licensing.getSnapshot();
    if (options?.includeLicenseToken && snapshot.licenseToken) {
      headers["x-rinawarp-license-token"] = snapshot.licenseToken;
    }

    return headers;
  }

  async json(path: string, init: AgentdRequestInit): Promise<unknown> {
    const response = await this.config.fetchImpl(`${this.config.baseUrl}${path}`, {
      method: init.method,
      headers: this.buildHeaders({
        includeLicenseToken: init.includeLicenseToken,
        headers: init.headers,
      }),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : `${init.method} ${path} failed (${response.status})`;
      throw new Error(message);
    }

    return payload;
  }
}
