/**
 * Docker Tool
 *
 * Tool for interacting with Docker and Docker Compose.
 * Part of the cloud control layer.
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface DockerResult {
  success: boolean
  output: string
  error?: string
}

export class DockerTool {
  private defaultTimeout = 60000

  /**
   * Execute a docker command
   */
  async execute(command: string, options?: { timeout?: number }): Promise<DockerResult> {
    const timeout = options?.timeout || this.defaultTimeout

    try {
      const { stdout, stderr } = await execAsync(`docker ${command}`, {
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      })

      if (stderr && !stderr.includes('WARNING')) {
        return {
          success: false,
          output: stdout,
          error: stderr,
        }
      }

      return {
        success: true,
        output: stdout || 'Command completed successfully',
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        output: '',
        error: errorMsg,
      }
    }
  }

  /**
   * Check if Docker is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await execAsync('docker info', { timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get container status
   */
  async ps(): Promise<DockerResult> {
    return this.execute('ps -a --format "{{.Names}}: {{.Status}}"')
  }

  /**
   * Get running containers
   */
  async psRunning(): Promise<DockerResult> {
    return this.execute('ps --format "{{.Names}}: {{.Status}}"')
  }

  /**
   * Build a container
   */
  async build(tag: string, path: string = '.'): Promise<DockerResult> {
    return this.execute(`build -t ${tag} ${path}`)
  }

  /**
   * Run a container
   */
  async run(image: string, name?: string, args?: string): Promise<DockerResult> {
    const containerName = name ? `--name ${name}` : ''
    const runArgs = args ? args : '-d'
    return this.execute(`run ${runArgs} ${containerName} ${image}`)
  }

  /**
   * Stop a container
   */
  async stop(container: string): Promise<DockerResult> {
    return this.execute(`stop ${container}`)
  }

  /**
   * Start a container
   */
  async start(container: string): Promise<DockerResult> {
    return this.execute(`start ${container}`)
  }

  /**
   * Remove a container
   */
  async rm(container: string, force?: boolean): Promise<DockerResult> {
    const forceFlag = force ? '-f' : ''
    return this.execute(`rm ${forceFlag} ${container}`)
  }

  /**
   * View logs
   */
  async logs(container: string, tail?: number): Promise<DockerResult> {
    const tailFlag = tail ? `--tail ${tail}` : '--tail 100'
    return this.execute(`logs ${tailFlag} ${container}`)
  }

  /**
   * Docker Compose: Start services
   */
  async composeUp(projectDir?: string): Promise<DockerResult> {
    const dir = projectDir ? `-f ${projectDir}` : ''
    return this.execute(`compose up -d ${dir}`)
  }

  /**
   * Docker Compose: Stop services
   */
  async composeDown(projectDir?: string): Promise<DockerResult> {
    const dir = projectDir ? `-f ${projectDir}` : ''
    return this.execute(`compose down ${dir}`)
  }

  /**
   * Docker Compose: Build services
   */
  async composeBuild(projectDir?: string): Promise<DockerResult> {
    const dir = projectDir ? `-f ${projectDir}` : ''
    return this.execute(`compose build ${dir}`)
  }

  /**
   * Docker Compose: View logs
   */
  async composeLogs(projectDir?: string, tail?: number): Promise<DockerResult> {
    const dir = projectDir ? `-f ${projectDir}` : ''
    const tailFlag = tail ? `--tail ${tail}` : '--tail 50'
    return this.execute(`compose logs ${tailFlag} ${dir}`)
  }

  /**
   * Get container stats
   */
  async stats(container?: string): Promise<DockerResult> {
    const containerArg = container || '--no-stream'
    return this.execute(`stats ${containerArg} --format \"{{.Name}}: {{.CPUPerc}} / {{.MemUsage}}\"`)
  }

  /**
   * Get system info
   */
  async info(): Promise<DockerResult> {
    return this.execute('info --format "{{.ServerVersion}}"')
  }

  /**
   * List images
   */
  async images(): Promise<DockerResult> {
    return this.execute('images --format "{{.Repository}}:{{.Tag}} ({{.Size}})"')
  }

  /**
   * Pull an image
   */
  async pull(image: string): Promise<DockerResult> {
    return this.execute(`pull ${image}`)
  }

  /**
   * Execute command in container
   */
  async exec(container: string, command: string): Promise<DockerResult> {
    return this.execute(`exec ${container} ${command}`)
  }
}

export const dockerTool = new DockerTool()
