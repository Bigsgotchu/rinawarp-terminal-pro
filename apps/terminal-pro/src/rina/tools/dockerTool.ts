/**
 * Docker tool — forwards docker operations to canonical runtime.
 */

import { forwardLegacyPrompt } from '../controller/legacyInputAdapter.js'

export interface DockerResult {
  success: boolean
  output: string
  error?: string
}

export class DockerTool {
  private defaultTimeout = 60000

  async execute(command: string, options?: { timeout?: number; workspaceRoot?: string }): Promise<DockerResult> {
    void (options?.timeout || this.defaultTimeout)
    const root = options?.workspaceRoot || process.cwd()
    const response = await forwardLegacyPrompt(`docker ${command}`, root, 'execute')
    return {
      success: response.ok,
      output: typeof response.output === 'string' ? response.output : String(response.output || ''),
      error: response.error,
    }
  }

  async isAvailable(): Promise<boolean> {
    return false
  }

  async ps(): Promise<DockerResult> {
    return this.execute('ps -a --format "{{.Names}}: {{.Status}}"')
  }
}

export const dockerTool = new DockerTool()
