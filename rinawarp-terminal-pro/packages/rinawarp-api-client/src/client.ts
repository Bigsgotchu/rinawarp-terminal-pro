import type {
  AuthStartRequest,
  AuthStartResponse,
  AuthVerifyResponse,
  DownloadTokenRequest,
  DownloadTokenResponse,
  MeResponse,
  PortalResponse,
} from "./types.js";
import type { GetAuth } from "./http.js";
import { jsonFetch } from "./http.js";

export function createApiClient(args: {
  baseUrl: string;
  getAuth?: GetAuth;
  withCredentials?: boolean;
}) {
  const base = args.baseUrl.replace(/\/+$/, "");

  return {
    authStart: (req: AuthStartRequest) =>
      jsonFetch<AuthStartResponse>({
        url: `${base}/api/auth/start`,
        method: "POST",
        body: req,
        getAuth: args.getAuth,
        withCredentials: args.withCredentials,
      }),

    authVerify: (token: string) =>
      jsonFetch<AuthVerifyResponse>({
        url: `${base}/api/auth/verify?token=${encodeURIComponent(token)}`,
        method: "GET",
        getAuth: args.getAuth,
        withCredentials: args.withCredentials,
      }),

    me: () =>
      jsonFetch<MeResponse>({
        url: `${base}/api/me`,
        method: "GET",
        getAuth: args.getAuth,
        withCredentials: args.withCredentials,
      }),

    downloadToken: (req: DownloadTokenRequest) =>
      jsonFetch<DownloadTokenResponse>({
        url: `${base}/api/download-token`,
        method: "POST",
        body: req,
        getAuth: args.getAuth,
        withCredentials: args.withCredentials,
      }),

    portal: () =>
      jsonFetch<PortalResponse>({
        url: `${base}/api/portal`,
        method: "POST",
        body: {},
        getAuth: args.getAuth,
        withCredentials: args.withCredentials,
      }),
  };
}
