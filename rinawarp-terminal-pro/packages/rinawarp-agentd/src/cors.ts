/**
 * Allow VS Code webviews/extension fetch on localhost.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

export function setCors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin || "";
  // VSCode webviews can be weird; simplest allow localhost callers.
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type,authorization");
}

export function handlePreflight(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res);
  res.statusCode = 204;
  res.end();
}
