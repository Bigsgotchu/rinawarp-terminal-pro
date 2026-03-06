export class APIError extends Error {
  public readonly status: number;
  public readonly bodyText: string;

  constructor(message: string, status: number, bodyText: string) {
    super(message);
    this.status = status;
    this.bodyText = bodyText;
  }
}

export type GetAuth =
  | (() => { kind: "cookie" })
  | (() => { kind: "bearer"; token: string })
  | undefined;

export async function jsonFetch<T>(args: {
  url: string;
  method: "GET" | "POST";
  body?: unknown;
  getAuth?: GetAuth;
  withCredentials?: boolean;
}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };

  const auth = args.getAuth?.();
  if (auth?.kind === "bearer") headers.authorization = `Bearer ${auth.token}`;

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

  return (await res.json()) as T;
}
