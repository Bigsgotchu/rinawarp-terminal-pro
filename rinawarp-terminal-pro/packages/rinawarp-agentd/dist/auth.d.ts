import type { IncomingMessage } from "node:http";
type TokenKind = "access" | "refresh";
export type AuthClaims = {
    sub: string;
    email: string;
    role: "owner" | "admin" | "member";
    kind: TokenKind;
    iat: number;
    exp: number;
};
export declare function createSignedAuthToken(input: {
    sub: string;
    email: string;
    role?: "owner" | "admin" | "member";
    kind: TokenKind;
    ttlSec: number;
    secret: string;
}): string;
export declare function verifySignedAuthToken(token: string, secret: string): AuthClaims | null;
export declare function parseAuthClaims(req: IncomingMessage): AuthClaims | null;
/**
 * Auth mode precedence:
 * 1) Signed JWT-like access token when RINAWARP_AGENTD_AUTH_SECRET is set
 * 2) Legacy static bearer token via RINAWARP_AGENTD_TOKEN
 * 3) Open (dev) when neither is set
 */
export declare function requireAuth(req: IncomingMessage, opts?: {
    allowAnonymous?: boolean;
}): void;
export {};
//# sourceMappingURL=auth.d.ts.map