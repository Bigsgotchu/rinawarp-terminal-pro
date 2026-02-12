/**
 * @rinawarp/tools
 *
 * Terminal internals - exported for use by tool implementations.
 * These functions are used by TerminalWriteTool to safely execute commands.
 */

/**
 * Split command into executable and arguments (prevents shell injection)
 */
export function splitCommand(cmd: string): { file: string; args: string[] } {
	const parts = cmd.trim().split(/\s+/);
	return { file: parts[0], args: parts.slice(1) };
}

/**
 * Secure environment filtering - prevents credential bleed into agent execution
 */
export function safeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
	const BLOCKED = [
		"AWS_SECRET_ACCESS_KEY",
		"STRIPE_SECRET_KEY",
		"STRIPE_WEBHOOK_SECRET",
		"DATABASE_URL",
		"CF_API_TOKEN",
		"NPM_TOKEN",
		"GITHUB_TOKEN",
		"SESSION_SECRET",
		"DOWNLOAD_TOKEN_SECRET",
	];

	const filtered: NodeJS.ProcessEnv = {};
	for (const [k, v] of Object.entries(env)) {
		if (!BLOCKED.includes(k) && v !== undefined) filtered[k] = v;
	}
	return filtered;
}
