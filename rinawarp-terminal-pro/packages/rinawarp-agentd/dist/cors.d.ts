/**
 * Allow VS Code webviews/extension fetch on localhost.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
export declare function setCors(req: IncomingMessage, res: ServerResponse): void;
export declare function handlePreflight(req: IncomingMessage, res: ServerResponse): void;
