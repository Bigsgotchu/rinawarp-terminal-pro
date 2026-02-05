export declare class APIError extends Error {
    readonly status: number;
    readonly bodyText: string;
    constructor(message: string, status: number, bodyText: string);
}
export type GetAuth = (() => {
    kind: "cookie";
}) | (() => {
    kind: "bearer";
    token: string;
}) | undefined;
export declare function jsonFetch<T>(args: {
    url: string;
    method: "GET" | "POST";
    body?: unknown;
    getAuth?: GetAuth;
    withCredentials?: boolean;
}): Promise<T>;
