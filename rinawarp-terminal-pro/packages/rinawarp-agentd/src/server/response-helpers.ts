import http from "node:http";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { parseAuthClaims } from "../auth.js";

export function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export async function readJson(req: http.IncomingMessage) {
  const parsed = await readRawJson(req);
  return parsed.json;
}

export async function readRawJson(
  req: http.IncomingMessage,
  opts?: { maxBytes?: number },
): Promise<{ raw: string; json: any | null }> {
  const chunks: Buffer[] = [];
  const maxBytes = Number.isFinite(opts?.maxBytes) ? Number(opts?.maxBytes) : Number.POSITIVE_INFINITY;
  let total = 0;
  for await (const c of req) {
    const chunk = Buffer.from(c);
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error(`payload too large (max ${maxBytes} bytes)`) as Error & { statusCode?: number };
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return { raw: "", json: null };
  return { raw, json: JSON.parse(raw) };
}

export function actorFromRequest(req: http.IncomingMessage): { actorId: string; actorEmail: string } {
  const claims = parseAuthClaims(req);
  if (claims) {
    return {
      actorId: claims.sub,
      actorEmail: claims.email,
    };
  }
  const actorId = String(req.headers["x-rina-actor-id"] || "usr_local").trim() || "usr_local";
  const actorEmail = String(req.headers["x-rina-actor-email"] || "owner@local").trim().toLowerCase() || "owner@local";
  return { actorId, actorEmail };
}

export function requestId(req: http.IncomingMessage): string {
  const id = String(req.headers["x-request-id"] || "").trim();
  return id || randomUUID();
}

export function clientIp(req: http.IncomingMessage): string {
  const forwarded = String(req.headers["x-forwarded-for"] || "").trim();
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress || "unknown";
}
