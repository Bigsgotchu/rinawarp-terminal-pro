export interface WorkspaceFilePreview {
  readonly ok: boolean;
  readonly content?: string;
  readonly truncated?: boolean;
  readonly error?: string;
}

export interface WorkspaceService {
  getDefaultCwd(): string;
  resolveCwd(input: unknown): string;
  listFiles(
    projectRoot: string,
    options?: { limit?: number; query?: string },
  ): Promise<readonly string[]>;
  readFile(projectRoot: string, relativePath: string): Promise<string>;
  readFilePreview(
    projectRoot: string,
    relativePath: string,
    options?: { maxBytes?: number },
  ): Promise<WorkspaceFilePreview>;
}
