/**
 * SSE (Server-Sent Events) for streaming output + lifecycle events.
 */
import type { ServerResponse } from "node:http";
export type SSEClient = {
    id: string;
    res: ServerResponse;
};
export declare function sseInit(res: ServerResponse): void;
export declare function sseSend(res: ServerResponse, event: string, data: unknown): void;
