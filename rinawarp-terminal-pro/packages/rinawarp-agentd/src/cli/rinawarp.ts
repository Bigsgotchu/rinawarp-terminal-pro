#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type SessionState = {
  access_token?: string;
  refresh_token?: string;
  workspace_id?: string;
  base_url?: string;
};

function sessionFile(): string {
  return path.join(os.homedir(), ".rinawarp", "session.json");
}

function loadSession(): SessionState {
  const fp = sessionFile();
  if (!fs.existsSync(fp)) return {};
  try {
    return JSON.parse(fs.readFileSync(fp, "utf8")) as SessionState;
  } catch {
    return {};
  }
}

function saveSession(state: SessionState) {
  const fp = sessionFile();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function arg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx < 0 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1] || null;
}

async function apiRequest(args: {
  method: "GET" | "POST" | "PUT";
  path: string;
  body?: unknown;
  useAuth?: boolean;
}) {
  const session = loadSession();
  const base = process.env.RINAWARP_API_BASE || session.base_url || "http://127.0.0.1:5055";
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (args.useAuth !== false && session.access_token) {
    headers.authorization = `Bearer ${session.access_token}`;
  }
  const resp = await fetch(`${base}${args.path}`, {
    method: args.method,
    headers,
    body: args.body ? JSON.stringify(args.body) : undefined,
  });
  const text = await resp.text();
  let parsed: unknown = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  return { status: resp.status, body: parsed };
}

async function cmdLogin() {
  const email = arg("--email") || "";
  const password = arg("--password") || "";
  if (!email) {
    console.error("Usage: rinawarp login --email <email> [--password <password>]");
    process.exit(1);
  }
  const res = await apiRequest({
    method: "POST",
    path: "/v1/auth/login",
    useAuth: false,
    body: { email, password },
  });
  if (res.status !== 200) {
    console.error(JSON.stringify(res.body, null, 2));
    process.exit(1);
  }
  const session = loadSession();
  const body = res.body as { access_token: string; refresh_token: string };
  saveSession({
    ...session,
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });
  console.log("Logged in.");
}

async function cmdAccountPlan() {
  const res = await apiRequest({ method: "GET", path: "/v1/account/plan" });
  console.log(JSON.stringify(res.body, null, 2));
  if (res.status >= 400) process.exit(1);
}

async function cmdWorkspaceInit() {
  const name = arg("--name") || "rinawarp-workspace";
  const region = arg("--region") || "us-east-1";
  const idem = `idem_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const session = loadSession();
  const base = process.env.RINAWARP_API_BASE || session.base_url || "http://127.0.0.1:5055";
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "idempotency-key": idem,
  };
  if (session.access_token) headers.authorization = `Bearer ${session.access_token}`;
  const resp = await fetch(`${base}/v1/workspaces`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, region }),
  });
  const body = await resp.json() as { workspace_id?: string };
  console.log(JSON.stringify(body, null, 2));
  if (resp.status !== 200 || !body.workspace_id) process.exit(1);
  saveSession({ ...session, workspace_id: body.workspace_id });
}

async function cmdTeamInviteCreate() {
  const email = arg("--email") || "";
  const role = arg("--role") || "member";
  const workspaceId = arg("--workspace-id") || loadSession().workspace_id || "";
  if (!email || !workspaceId) {
    console.error("Usage: rinawarp team invite create --email <email> [--role member|admin|owner] [--workspace-id ws_...]");
    process.exit(1);
  }
  const session = loadSession();
  const idem = `idem_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const base = process.env.RINAWARP_API_BASE || session.base_url || "http://127.0.0.1:5055";
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "idempotency-key": idem,
  };
  if (session.access_token) headers.authorization = `Bearer ${session.access_token}`;
  const resp = await fetch(`${base}/v1/workspaces/${encodeURIComponent(workspaceId)}/invites`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      role,
      expires_in_hours: 72,
      send_email: true,
    }),
  });
  const body = await resp.json();
  console.log(JSON.stringify(body, null, 2));
  if (resp.status >= 400) process.exit(1);
}

async function cmdTeamInviteAccept() {
  const token = arg("--token") || "";
  if (!token) {
    console.error("Usage: rinawarp team invite accept --token <token>");
    process.exit(1);
  }
  const res = await apiRequest({
    method: "POST",
    path: "/v1/invites/accept",
    body: { token },
  });
  console.log(JSON.stringify(res.body, null, 2));
  if (res.status >= 400) process.exit(1);
}

async function cmdAuditQuery() {
  const workspaceId = arg("--workspace-id") || loadSession().workspace_id || "";
  const type = arg("--type");
  if (!workspaceId) {
    console.error("Usage: rinawarp audit query --workspace-id <ws_id> [--type invite_created]");
    process.exit(1);
  }
  const qs = new URLSearchParams();
  if (type) qs.set("type", type);
  const pathPart = `/v1/workspaces/${encodeURIComponent(workspaceId)}/audit${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await apiRequest({ method: "GET", path: pathPart });
  console.log(JSON.stringify(res.body, null, 2));
  if (res.status >= 400) process.exit(1);
}

async function cmdSyncStatus() {
  const workspaceId = arg("--workspace-id") || loadSession().workspace_id || "";
  if (!workspaceId) {
    console.error("Usage: rinawarp sync status --workspace-id <ws_id>");
    process.exit(1);
  }
  const res = await apiRequest({ method: "GET", path: `/v1/workspaces/${encodeURIComponent(workspaceId)}/sync/state` });
  console.log(JSON.stringify(res.body, null, 2));
  if (res.status >= 400) process.exit(1);
}

async function main() {
  const [cmd, subcmd, action] = process.argv.slice(2);
  if (cmd === "login") return cmdLogin();
  if (cmd === "account" && subcmd === "plan") return cmdAccountPlan();
  if (cmd === "workspace" && subcmd === "init") return cmdWorkspaceInit();
  if (cmd === "team" && subcmd === "invite" && action === "create") return cmdTeamInviteCreate();
  if (cmd === "team" && subcmd === "invite" && action === "accept") return cmdTeamInviteAccept();
  if (cmd === "audit" && subcmd === "query") return cmdAuditQuery();
  if (cmd === "sync" && subcmd === "status") return cmdSyncStatus();
  console.error("Unknown command.");
  console.error("Supported:");
  console.error("  rinawarp login --email ... [--password ...]");
  console.error("  rinawarp account plan");
  console.error("  rinawarp workspace init --name ... [--region ...]");
  console.error("  rinawarp team invite create --email ... [--role ...] [--workspace-id ...]");
  console.error("  rinawarp team invite accept --token ...");
  console.error("  rinawarp audit query --workspace-id ... [--type ...]");
  console.error("  rinawarp sync status --workspace-id ...");
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
