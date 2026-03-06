import crypto from "node:crypto";
import type http from "node:http";
import { subscribeWorkspaceEvents } from "./eventBus.js";

function wsAccept(key: string): string {
  return crypto.createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, "utf8").digest("base64");
}

function encodeTextFrame(text: string): Buffer {
  const payload = Buffer.from(text, "utf8");
  const len = payload.length;
  if (len < 126) return Buffer.concat([Buffer.from([0x81, len]), payload]);
  if (len < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
    return Buffer.concat([header, payload]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(len), 2);
  return Buffer.concat([header, payload]);
}

export function attachWorkspaceWebSocketServer(args: {
  server: http.Server;
  authorize: (token: string) => boolean;
}) {
  args.server.on("upgrade", (req, socket) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (url.pathname !== "/v1/ws") return socket.destroy();
      const token = String(url.searchParams.get("access_token") || "").trim();
      const workspaceId = String(url.searchParams.get("workspace_id") || "").trim();
      if (!workspaceId || !token || !args.authorize(token)) return socket.destroy();
      const key = String(req.headers["sec-websocket-key"] || "");
      if (!key) return socket.destroy();
      const accept = wsAccept(key);
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          `Sec-WebSocket-Accept: ${accept}\r\n` +
          "\r\n",
      );
      const unsub = subscribeWorkspaceEvents(workspaceId, (evt) => {
        try {
          socket.write(encodeTextFrame(JSON.stringify(evt)));
        } catch {
          // ignore write errors
        }
      });
      socket.on("close", () => unsub());
      socket.on("end", () => unsub());
      socket.on("error", () => unsub());
      socket.on("data", (buffer: Buffer) => {
        // respond to ping/control minimally; we don't parse app payload now
        if (!buffer || buffer.length < 2) return;
        const opcode = buffer[0] & 0x0f;
        if (opcode === 0x8) {
          try {
            socket.end();
          } catch {
            // ignore
          }
        }
      });
      // initial ack frame
      socket.write(
        encodeTextFrame(
          JSON.stringify({
            type: "ws_ready",
            workspace_id: workspaceId,
            ts: new Date().toISOString(),
          }),
        ),
      );
    } catch {
      socket.destroy();
    }
  });
}

