import { createServer } from "./server.js";
const port = Number(process.env.RINAWARP_AGENTD_PORT || 5055);
void createServer({ port }).listen();
