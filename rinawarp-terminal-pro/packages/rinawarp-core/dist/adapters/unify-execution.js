/**
 * @rinawarp/core
 *
 * Unified execution adapter - routes all execution through the engine
 */
export function buildExecutionContext(args) {
    const validTiers = ["starter", "creator", "pro", "pioneer", "founder", "enterprise"];
    if (!validTiers.includes(args.license)) {
        throw new Error(`Invalid license tier: ${args.license}`);
    }
    return {
        projectRoot: args.projectRoot,
        license: args.license,
        confirmationToken: args.confirmationToken,
        stopRequested: args.stopRequested,
        emit: args.emit,
    };
}
export async function executeViaEngine(args) {
    const ctx = buildExecutionContext({
        projectRoot: args.projectRoot,
        license: args.license,
        confirmationToken: args.confirmationToken,
        stopRequested: args.stopRequested,
        emit: args.emit,
    });
    return args.engine.execute(args.plan, ctx);
}
