import type { AuthStartRequest, AuthStartResponse, AuthVerifyResponse, DownloadTokenRequest, DownloadTokenResponse, MeResponse, PortalResponse } from "./types.js";
import type { GetAuth } from "./http.js";
export declare function createApiClient(args: {
    baseUrl: string;
    getAuth?: GetAuth;
    withCredentials?: boolean;
}): {
    authStart: (req: AuthStartRequest) => Promise<AuthStartResponse>;
    authVerify: (token: string) => Promise<AuthVerifyResponse>;
    me: () => Promise<MeResponse>;
    downloadToken: (req: DownloadTokenRequest) => Promise<DownloadTokenResponse>;
    portal: () => Promise<PortalResponse>;
};
