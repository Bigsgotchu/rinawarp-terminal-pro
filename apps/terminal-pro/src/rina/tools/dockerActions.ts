import type { RinaTask } from '../brain.js'
import { DOCKER_ALLOWED_OPTIONS, sanitizeIdentifier, sanitizeOptions } from './dockerHelpers.js'
import { runDockerCommand } from './dockerRuntime.js'

type DockerInput = {
  command?: string
  image?: string
  container?: string
  options?: string
  execCommand?: string
  path?: string
  tag?: string
}

export function sanitizeDockerInput(input: DockerInput) {
  return {
    image: input.image ? sanitizeIdentifier(input.image, 'image') : undefined,
    container: input.container ? sanitizeIdentifier(input.container, 'container') : undefined,
    path: input.path ? sanitizeIdentifier(input.path, 'path') : undefined,
    tag: input.tag ? sanitizeIdentifier(input.tag, 'tag') : undefined,
  }
}

export async function executeDockerCommand(args: {
  command: string
  input: DockerInput
  sanitized: ReturnType<typeof sanitizeDockerInput>
}) {
  const { command, input, sanitized } = args

  switch (command) {
    case 'build': {
      if (!sanitized.image || !sanitized.path) return { ok: false, error: 'Build requires image name and path' }
      const tagFlag = sanitized.tag ? `-t ${sanitized.tag}` : ''
      return toToolResult(command, await runDockerCommand(`docker build ${tagFlag} ${sanitized.path}`))
    }
    case 'run': {
      if (!sanitized.image) return { ok: false, error: 'Run requires image name' }
      const options = sanitizeOptions(input.options || '', DOCKER_ALLOWED_OPTIONS.run || [])
      return toToolResult(command, await runDockerCommand(`docker run ${options} ${sanitized.image}`))
    }
    case 'ps': {
      const options = sanitizeOptions(input.options || '', DOCKER_ALLOWED_OPTIONS.ps || [])
      return toToolResult(command, await runDockerCommand(`docker ps ${options}`))
    }
    case 'images':
      return toToolResult(command, await runDockerCommand('docker images'))
    case 'stop':
      if (!sanitized.container) return { ok: false, error: 'Stop requires container name or ID' }
      return toToolResult(command, await runDockerCommand(`docker stop ${sanitized.container}`))
    case 'start':
      if (!sanitized.container) return { ok: false, error: 'Start requires container name or ID' }
      return toToolResult(command, await runDockerCommand(`docker start ${sanitized.container}`))
    case 'restart':
      if (!sanitized.container) return { ok: false, error: 'Restart requires container name or ID' }
      return toToolResult(command, await runDockerCommand(`docker restart ${sanitized.container}`))
    case 'rm':
      if (!sanitized.container) return { ok: false, error: 'Remove requires container name or ID' }
      return toToolResult(command, await runDockerCommand(`docker rm ${sanitized.container}`))
    case 'rmi':
      if (!sanitized.image) return { ok: false, error: 'Remove image requires image name or ID' }
      return toToolResult(command, await runDockerCommand(`docker rmi ${sanitized.image}`))
    case 'logs': {
      if (!sanitized.container) return { ok: false, error: 'Logs requires container name or ID' }
      const options = sanitizeOptions(input.options || '', DOCKER_ALLOWED_OPTIONS.logs || [])
      return toToolResult(command, await runDockerCommand(`docker logs ${options} ${sanitized.container}`))
    }
    case 'exec': {
      if (!sanitized.container || !input.execCommand) {
        return { ok: false, error: 'Exec requires container and execCommand' }
      }
      const sanitizedExecCommand = sanitizeIdentifier(input.execCommand, 'execCommand')
      const options = sanitizeOptions(input.options || '', DOCKER_ALLOWED_OPTIONS.exec || [])
      return toToolResult(
        command,
        await runDockerCommand(`docker exec ${options} ${sanitized.container} ${sanitizedExecCommand}`)
      )
    }
    case 'pull': {
      if (!sanitized.image) return { ok: false, error: 'Pull requires image name' }
      const options = sanitizeOptions(input.options || '', DOCKER_ALLOWED_OPTIONS.pull || [])
      return toToolResult(command, await runDockerCommand(`docker pull ${options} ${sanitized.image}`))
    }
    case 'info':
      return toToolResult(command, await runDockerCommand('docker info'))
    case 'version':
      return toToolResult(command, await runDockerCommand('docker version'))
    default:
      return { ok: false, error: `Unknown docker command: ${command}` }
  }
}

function toToolResult(
  command: string,
  result: { stdout: string; stderr: string; success: boolean }
) {
  return {
    ok: result.success,
    output: {
      command,
      stdout: result.stdout,
      stderr: result.stderr,
    },
    error: result.success ? undefined : result.stderr,
  }
}

function buildTask(intent: string, input: DockerInput): RinaTask {
  return {
    intent,
    tool: 'docker',
    input,
  }
}

export const dockerTaskBuilders = {
  build(imageName: string, dockerfilePath: string, tag?: string) {
    return buildTask('docker-build', { command: 'build', image: imageName, path: dockerfilePath, tag })
  },
  run(imageName: string, options = '') {
    return buildTask('docker-run', { command: 'run', image: imageName, options })
  },
  listContainers(all = false) {
    return buildTask('docker-ps', { command: 'ps', options: all ? '-a' : '' })
  },
  listImages() {
    return buildTask('docker-images', { command: 'images' })
  },
  stop(containerName: string) {
    return buildTask('docker-stop', { command: 'stop', container: containerName })
  },
  start(containerName: string) {
    return buildTask('docker-start', { command: 'start', container: containerName })
  },
  restart(containerName: string) {
    return buildTask('docker-restart', { command: 'restart', container: containerName })
  },
  remove(containerName: string) {
    return buildTask('docker-rm', { command: 'rm', container: containerName })
  },
  removeImage(imageName: string) {
    return buildTask('docker-rmi', { command: 'rmi', image: imageName })
  },
  exec(containerName: string, execCommand: string, options = '') {
    return buildTask('docker-exec', { command: 'exec', container: containerName, execCommand, options })
  },
  logs(containerName: string) {
    return buildTask('docker-logs', { command: 'logs', container: containerName })
  },
  pull(imageName: string) {
    return buildTask('docker-pull', { command: 'pull', image: imageName })
  },
}
