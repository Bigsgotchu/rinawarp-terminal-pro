/**
 * LEGACY COMPATIBILITY — error explanation adapter only.
 * Forwards to canonical runtime via RinaRuntimeBridge (no direct LLM calls).
 */

import { legacyExplainErrorAsText } from '../runtime/bridge/RinaRuntimeBridge.js'

const DEFAULT_PROJECT_ROOT = process.cwd()

/**
 * Explain an error via canonical runtime (pattern match first, then ingress).
 */
export async function explainError(
  errorText: string,
  context?: string,
  projectRoot: string = DEFAULT_PROJECT_ROOT,
): Promise<string> {
  const patternMatch = explainErrorPattern(errorText)
  if (patternMatch) {
    return patternMatch
  }

  try {
    return await legacyExplainErrorAsText({ errorText, context }, projectRoot)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return `Failed to explain error: ${message}

Try running 'rina doctor' for automatic diagnostics.`
  }
}

/**
 * Quick error patterns — no runtime call required.
 */
export function explainErrorPattern(errorText: string): string | null {
  const patterns: Record<string, { title: string; fix: string }> = {
    ENOENT: {
      title: 'File Not Found',
      fix: 'The file or directory does not exist. Check the path and ensure the file was created.',
    },
    EACCES: {
      title: 'Permission Denied',
      fix: "You don't have permission to access this file.\nTry: sudo chown -R $USER .",
    },
    ECONNREFUSED: {
      title: 'Connection Refused',
      fix: "The server isn't running or port is blocked.\nCheck if the service is running and try again.",
    },
    'npm install error': {
      title: 'npm Install Failed',
      fix: 'Try these steps:\n1. rm -rf node_modules package-lock.json\n2. npm cache clean --force\n3. npm install',
    },
    docker: {
      title: 'Docker Issue',
      fix: 'Common fixes:\n1. docker system prune -a\n2. docker-compose down && docker-compose up -d\n3. Check Docker daemon is running',
    },
    'git merge': {
      title: 'Git Merge Conflict',
      fix: '1. Open conflicting files\n2. Resolve conflicts manually\n3. git add <files>\n4. git commit',
    },
    typescript: {
      title: 'TypeScript Error',
      fix: 'Try:\n1. npx tsc --noEmit\n2. Check tsconfig.json\n3. Install types: npm i -D @types/<package>',
    },
  }

  const lowerError = errorText.toLowerCase()

  for (const [pattern, solution] of Object.entries(patterns)) {
    if (lowerError.includes(pattern.toLowerCase())) {
      return `🔍 ${solution.title}\n\n💡 ${solution.fix}`
    }
  }

  return null
}
