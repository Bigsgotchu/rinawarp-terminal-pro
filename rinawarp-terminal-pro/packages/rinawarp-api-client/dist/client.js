import { jsonFetch } from "./http.js";
export function createApiClient(args) {
    const base = args.baseUrl.replace(/\/+$/, "");
    return {
        authStart: (req) => jsonFetch({
            url: `${base}/api/auth/start`,
            method: "POST",
            body: req,
            getAuth: args.getAuth,
            withCredentials: args.withCredentials,
        }),
        authVerify: (token) => jsonFetch({
            url: `${base}/api/auth/verify?token=${encodeURIComponent(token)}`,
            method: "GET",
            getAuth: args.getAuth,
            withCredentials: args.withCredentials,
        }),
        me: () => jsonFetch({
            url: `${base}/api/me`,
            method: "GET",
            getAuth: args.getAuth,
            withCredentials: args.withCredentials,
        }),
        downloadToken: (req) => jsonFetch({
            url: `${base}/api/download-token`,
            method: "POST",
            body: req,
            getAuth: args.getAuth,
            withCredentials: args.withCredentials,
        }),
        portal: () => jsonFetch({
            url: `${base}/api/portal`,
            method: "POST",
            body: {},
            getAuth: args.getAuth,
            withCredentials: args.withCredentials,
        }),
    };
}
