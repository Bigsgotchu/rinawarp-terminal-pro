export class APIError extends Error {
    status;
    bodyText;
    constructor(message, status, bodyText) {
        super(message);
        this.status = status;
        this.bodyText = bodyText;
    }
}
export async function jsonFetch(args) {
    const headers = { "content-type": "application/json" };
    const auth = args.getAuth?.();
    if (auth?.kind === "bearer")
        headers.authorization = `Bearer ${auth.token}`;
    const res = await fetch(args.url, {
        method: args.method,
        headers,
        body: args.body ? JSON.stringify(args.body) : undefined,
        credentials: args.withCredentials ? "include" : "omit",
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new APIError(`Request failed: ${args.method} ${args.url}`, res.status, text);
    }
    return (await res.json());
}
