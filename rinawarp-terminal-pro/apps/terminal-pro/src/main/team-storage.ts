import fs from "node:fs";
import path from "node:path";
import { readJsonIfExists, writeJsonFile } from "./json-storage.js";

export type Role = "owner" | "operator" | "viewer";

export type ShareRecord = {
  id: string;
  createdAt: string;
  createdBy: string;
  title?: string;
  content: string;
  revoked: boolean;
  expiresAt: string;
  requiredRole: Role;
};

export type SharesDb = { shares: ShareRecord[] };

export type TeamDb = {
  currentUser?: string;
  members: Array<{ email: string; role: Role }>;
};

export type TeamActivityAction =
  | "share_created"
  | "share_revoked"
  | "share_accessed"
  | "share_access_denied"
  | "invite_created"
  | "invite_revoked"
  | "invite_accepted"
  | "member_upserted"
  | "member_removed"
  | "current_user_changed";

export type TeamActivityRecord = {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: Role;
  action: TeamActivityAction;
  target: string;
  details?: Record<string, string | number | boolean | null>;
};

export type TeamInviteRecord = {
  id: string;
  token: string;
  email: string;
  role: Role;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  acceptedAt?: string;
  acceptedBy?: string;
};

export type TeamInvitesDb = {
  invites: TeamInviteRecord[];
};

export function createTeamStorage(paths: {
  sharesFile: () => string;
  teamFile: () => string;
  teamInvitesFile: () => string;
  teamActivityFile: () => string;
}) {
  function loadSharesDb(): SharesDb {
    const parsed = readJsonIfExists<SharesDb>(paths.sharesFile()) ?? { shares: [] };
    const normalized = (parsed.shares || []).map((s) => {
      const createdAt = s.createdAt || new Date().toISOString();
      const expiresAt = s.expiresAt || new Date(Date.parse(createdAt) + 7 * 24 * 60 * 60 * 1000).toISOString();
      return {
        id: s.id,
        createdAt,
        createdBy: s.createdBy || "owner@local",
        title: s.title,
        content: s.content || "",
        revoked: !!s.revoked,
        expiresAt,
        requiredRole: s.requiredRole || "viewer",
      } as ShareRecord;
    });
    return { shares: normalized };
  }

  function saveSharesDb(db: SharesDb) {
    writeJsonFile(paths.sharesFile(), db);
  }

  function loadTeamDb(): TeamDb {
    return readJsonIfExists<TeamDb>(paths.teamFile()) ?? {
      currentUser: "owner@local",
      members: [{ email: "owner@local", role: "owner" }],
    };
  }

  function saveTeamDb(db: TeamDb) {
    writeJsonFile(paths.teamFile(), db);
  }

  function loadTeamInvitesDb(): TeamInvitesDb {
    const parsed = readJsonIfExists<TeamInvitesDb>(paths.teamInvitesFile()) ?? { invites: [] };
    const nowMs = Date.now();
    const normalized = (parsed.invites || []).map((inv) => {
      const expiresAt = inv.expiresAt || new Date(nowMs + 72 * 60 * 60 * 1000).toISOString();
      const expired = Date.parse(expiresAt) <= nowMs;
      const status = inv.status === "accepted" || inv.status === "revoked" ? inv.status : expired ? "expired" : "pending";
      return {
        id: inv.id || `inv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        token: inv.token || "",
        email: String(inv.email || "").trim().toLowerCase(),
        role: inv.role && ["owner", "operator", "viewer"].includes(inv.role) ? inv.role : "viewer",
        createdAt: inv.createdAt || new Date().toISOString(),
        createdBy: inv.createdBy || "owner@local",
        expiresAt,
        status,
        acceptedAt: inv.acceptedAt,
        acceptedBy: inv.acceptedBy,
      } as TeamInviteRecord;
    });
    return { invites: normalized };
  }

  function saveTeamInvitesDb(db: TeamInvitesDb) {
    writeJsonFile(paths.teamInvitesFile(), db);
  }

  function loadTeamActivity(limit = 200): TeamActivityRecord[] {
    try {
      const p = paths.teamActivityFile();
      if (!fs.existsSync(p)) return [];
      const raw = fs.readFileSync(p, "utf-8");
      const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const parsed: TeamActivityRecord[] = [];
      for (const line of lines) {
        try {
          const rec = JSON.parse(line) as TeamActivityRecord;
          if (!rec || !rec.id || !rec.timestamp || !rec.actor || !rec.action || !rec.target) continue;
          parsed.push(rec);
        } catch {
          // skip malformed line
        }
      }
      return parsed.slice(-Math.max(1, Math.floor(limit))).reverse();
    } catch {
      return [];
    }
  }

  function appendTeamActivity(args: {
    action: TeamActivityAction;
    target: string;
    actor: string;
    actorRole: Role;
    details?: TeamActivityRecord["details"];
  }) {
    try {
      const rec: TeamActivityRecord = {
        id: `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        actor: args.actor,
        actorRole: args.actorRole,
        action: args.action,
        target: String(args.target || "unknown"),
        details: args.details,
      };
      fs.mkdirSync(path.dirname(paths.teamActivityFile()), { recursive: true });
      fs.appendFileSync(paths.teamActivityFile(), `${JSON.stringify(rec)}\n`, "utf-8");
    } catch {
      // swallow activity log write failures
    }
  }

  return {
    loadSharesDb,
    saveSharesDb,
    loadTeamDb,
    saveTeamDb,
    loadTeamInvitesDb,
    saveTeamInvitesDb,
    loadTeamActivity,
    appendTeamActivity,
  };
}
