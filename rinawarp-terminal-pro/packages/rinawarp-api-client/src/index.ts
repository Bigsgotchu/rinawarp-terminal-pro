/**
 * RinaWarp API Client - TypeScript Types & Client
 * v1.0.0
 * 
 * Single source of truth for auth + account API contracts.
 * See: docs/API_AUTH_ACCOUNT_CONTRACT.md
 */

// ============================================================================
// Types
// ============================================================================

export type AuthMode = "login" | "signup";

export type LicenseTier = "starter" | "pro" | "lifetime";
export type LicenseStatus = "active" | "expired" | "revoked";

export type Platform = "linux-appimage" | "linux-deb" | "windows" | "macos";

// ---------------------------------------------------------------------------
// Auth Endpoints
// ---------------------------------------------------------------------------

export interface AuthStartRequest {
  email: string;
  mode?: AuthMode;
}

export interface AuthStartResponse {
  ok: true;
  message: string;
  next?: string;
}

export interface AuthStartError {
  ok: false;
  error: "invalid_email" | "rate_limited" | "internal_error";
}

// ---------------------------------------------------------------------------

export interface AuthVerifyRequest {
  token: string;
}

export interface AuthVerifyResponseCookie {
  ok: true;
  user: User;
  redirect: string;
  // Sets cookie: rinawarp_session
}

export interface AuthVerifyResponseBearer {
  ok: true;
  token: string;
  user: User;
  redirect: string;
}

export type AuthVerifyResponse = AuthVerifyResponseCookie | AuthVerifyResponseBearer;

export interface AuthVerifyError {
  ok: false;
  error: "missing_token" | "token_invalid" | "token_used";
}

// ---------------------------------------------------------------------------
// User & License
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface License {
  tier: LicenseTier;
  status: LicenseStatus;
  expiresAt: string | null;
}

export interface MeResponse {
  ok: true;
  user: User;
  license: License;
}

export interface MeError {
  ok: false;
  error: "unauthorized";
}

// ---------------------------------------------------------------------------
// Download Token
// ---------------------------------------------------------------------------

export interface DownloadTokenRequest {
  product: "terminal-pro";
  version: string;
  platform: Platform;
}

export interface DownloadUrls {
  linuxAppimage?: string;
  linuxDeb?: string;
  windows?: string;
  macos?: string;
}

export interface DownloadTokenResponse {
  ok: true;
  token: string;
  expiresAt: string;
  urls: DownloadUrls;
}

export interface DownloadTokenError {
  ok: false;
  error: "unauthorized" | "payment_required" | "forbidden" | "rate_limited";
}

// ---------------------------------------------------------------------------
// Billing Portal
// ---------------------------------------------------------------------------

export interface PortalResponse {
  ok: true;
  url: string;
}

export interface PortalError {
  ok: false;
  error: "unauthorized" | "portal_unavailable";
}

// ============================================================================
// API Client
// ============================================================================

export interface RinaWarpClientOptions {
  baseUrl?: string;
  credentials?: RequestCredentials;
  token?: string;
}

export class RinaWarpError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = "RinaWarpError";
  }
}

export class RinaWarpClient {
  private baseUrl: string;
  private credentials?: RequestCredentials;
  private token?: string;

  constructor(options: RinaWarpClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://api.rinawarptech.com";
    this.credentials = options.credentials;
    this.token = options.token;
  }

  /**
   * Set the bearer token for authenticated requests
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Set credentials mode for cookie-based auth
   */
  setCredentials(mode: RequestCredentials): void {
    this.credentials = mode;
  }

  private async fetch<T>(
    endpoint: string,
    init: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string>),
    };

    // Add authorization header if token is set
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const fetchInit: RequestInit = {
      ...init,
      headers,
    };

    if (this.credentials) {
      fetchInit.credentials = this.credentials;
    }

    const response = await fetch(url, fetchInit);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new RinaWarpError(
        error.error || `HTTP ${response.status}`,
        error.error,
        response.status
      );
    }

    return response.json();
  }

  // ---------------------------------------------------------------------------
  // Auth Endpoints
  // ---------------------------------------------------------------------------

  /**
   * POST /api/auth/start
   * Start the auth flow (magic link)
   */
  async authStart(
    email: string,
    mode: AuthMode = "login"
  ): Promise<AuthStartResponse> {
    return this.fetch<AuthStartResponse>("/api/auth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mode }),
    });
  }

  /**
   * GET /api/auth/verify?token=...
   * Verify the magic link token and establish an authenticated session
   */
  async authVerify(token: string): Promise<AuthVerifyResponse> {
    return this.fetch<AuthVerifyResponse>(
      `/api/auth/verify?token=${encodeURIComponent(token)}`,
      { method: "GET" }
    );
  }

  // ---------------------------------------------------------------------------
  // User & License
  // ---------------------------------------------------------------------------

  /**
   * GET /api/me
   * Return the current authenticated user + entitlements
   */
  async getMe(): Promise<MeResponse> {
    return this.fetch<MeResponse>("/api/me", { method: "GET" });
  }

  // ---------------------------------------------------------------------------
  // Download Token
  // ---------------------------------------------------------------------------

  /**
   * POST /api/download-token
   * Mint a short-lived download token used for installer URLs
   */
  async createDownloadToken(
    version: string,
    platform: Platform
  ): Promise<DownloadTokenResponse> {
    return this.fetch<DownloadTokenResponse>("/api/download-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: "terminal-pro",
        version,
        platform,
      }),
    });
  }

  // ---------------------------------------------------------------------------
  // Billing Portal
  // ---------------------------------------------------------------------------

  /**
   * POST /api/portal
   * Create a billing portal session URL
   */
  async createPortal(): Promise<PortalResponse> {
    return this.fetch<PortalResponse>("/api/portal", { method: "POST" });
  }
}

// ============================================================================
// Default Export
// ============================================================================

export { RinaWarpClient as default };

// Named exports for convenience
export const createClient = (options?: RinaWarpClientOptions) =>
  new RinaWarpClient(options);
