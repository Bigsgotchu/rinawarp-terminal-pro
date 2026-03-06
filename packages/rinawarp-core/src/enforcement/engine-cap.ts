/**
 * @rinawarp/core
 * 
 * Opaque capability token: prevents direct tool execution from non-engine code.
 * 
 * This is a compile-time security mechanism. Only ExecutionEngine can create
 * this token, and tool implementations must require it as a parameter.
 * Without the token, spawning/command execution becomes impossible at compile time.
 */

export const ENGINE_CAP: unique symbol = Symbol("ENGINE_CAP");
export type EngineCap = { readonly [ENGINE_CAP]: true };

export function createEngineCap(): EngineCap {
	return { [ENGINE_CAP]: true } as const;
}

/**
 * Type guard to validate EngineCap at runtime
 */
export function isEngineCap(value: unknown): value is EngineCap {
	return (
		typeof value === "object" &&
		value !== null &&
		ENGINE_CAP in (value as Record<string, unknown>)
	);
}
