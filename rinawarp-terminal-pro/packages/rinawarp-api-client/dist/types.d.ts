export type LicenseTier = "starter" | "creator" | "pro" | "pioneer" | "founder" | "enterprise";
export type ApiOk<T> = T & {
    ok: true;
};
export type ApiErr = {
    ok: false;
    error: string;
    message?: string;
};
export type AuthMode = "login" | "signup";
export interface AuthStartRequest {
    email: string;
    mode?: AuthMode;
}
export type AuthStartResponse = ApiOk<{
    message: string;
    next?: string;
}> | ApiErr;
export type AuthVerifyResponse = ApiOk<{
    user: {
        id: string;
        email: string;
    };
    redirect?: string;
    token?: string;
}> | ApiErr;
export type MeResponse = ApiOk<{
    user: {
        id: string;
        email: string;
        createdAt?: string;
    };
    license: {
        tier: LicenseTier;
        status: "active" | "inactive";
        expiresAt: string | null;
    };
}> | ApiErr;
export type DownloadPlatform = "linux-appimage" | "linux-deb" | "windows" | "macos";
export interface DownloadTokenRequest {
    product: "terminal-pro";
    version: string;
    platform: DownloadPlatform;
}
export type DownloadTokenResponse = ApiOk<{
    token: string;
    expiresAt: string;
    urls: Partial<Record<DownloadPlatform, string>>;
}> | ApiErr;
export type PortalResponse = ApiOk<{
    url: string;
}> | ApiErr;
