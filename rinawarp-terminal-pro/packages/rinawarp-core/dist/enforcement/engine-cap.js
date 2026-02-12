/**
 * @rinawarp/core
 *
 * Opaque capability token: prevents direct tool execution from non-engine code.
 *
 * This is a compile-time security mechanism. Only ExecutionEngine can create
 * this token, and tool implementations must require it as a parameter.
 * Without the token, spawning/command execution becomes impossible at compile time.
 */
export const ENGINE_CAP = Symbol("ENGINE_CAP");
export function createEngineCap() {
    return { [ENGINE_CAP]: true };
}
/**
 * Type guard to validate EngineCap at runtime
 */
export function isEngineCap(value) {
    return (typeof value === "object" &&
        value !== null &&
        ENGINE_CAP in value);
}
