import http from "node:http";

export async function handleFileRoutes(
  _req: http.IncomingMessage,
  _res: http.ServerResponse,
  _url: URL,
): Promise<boolean> {
  return false;
}
