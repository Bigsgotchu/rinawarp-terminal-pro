/**
 * SSE (Server-Sent Events) for streaming output + lifecycle events.
 */
import type { ServerResponse } from "node:http";

export type SSEClient = {
  id: string;
  res: ServerResponse;
};

export function sseInit(res: ServerResponse) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });
  res.write("\n");
}

export function sseSend(res: ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
