/**
 * @rinawarp/core
 *
 * Opaque capability token: prevents direct tool execution from non-engine code.
 *
 * This is a compile-time security mechanism. Only ExecutionEngine can create
 * this token, and tool implementations must require it as a parameter.
 * Without the token, spawning/command execution becomes impossible at compile time.
 */
export declare const ENGINE_CAP: unique symbol;
export type EngineCap = {
    readonly [ENGINE_CAP]: true;
};
export declare function createEngineCap(): EngineCap;
/**
 * Type guard to validate EngineCap at runtime
 */
export declare function isEngineCap(value: unknown): value is EngineCap;
