import {
    createWorkspaceService,
} from '../../../../../packages/runtime-feature-workspace/dist/index.js';
import type {
    CodeListFilesArgs,
    CodeListFilesResult,
    CodeReadFileArgs,
    CodeReadFileResult,
    WorkspaceRuntimeHelperDeps,
} from '../startup/runtimeTypes.js';

export function createWorkspaceRuntimeHelpers(deps: WorkspaceRuntimeHelperDeps) {
    const {
        appProjectRoot,
        normalizeProjectRoot,
        resolveProjectRootSafe,
        canonicalizePath,
        isWithinRoot,
    } = deps;
    const workspaceService = createWorkspaceService({
        appProjectRoot,
        normalizeProjectRoot,
        resolveProjectRootSafe,
        canonicalizePath,
        isWithinRoot,
    });
    async function codeListFilesForIpc(args: CodeListFilesArgs): Promise<CodeListFilesResult> {
        const projectRoot = resolveProjectRootSafe(args.projectRoot);
        const files = await workspaceService.listFiles(projectRoot, {
            limit: args.limit,
            query: args.query,
        });
        return { files };
    }
    async function codeReadFileForIpc(args: CodeReadFileArgs): Promise<CodeReadFileResult> {
        const projectRoot = resolveProjectRootSafe(args.projectRoot);
        const content = await workspaceService.readFile(projectRoot, args.relativePath);
        return { content };
    }
    return {
        workspaceService,
        codeListFilesForIpc,
        codeReadFileForIpc,
    };
}
