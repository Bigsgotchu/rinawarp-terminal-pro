import type { FixNarrationItem, FixNarrationLevel, FixStepModel } from '../workbench/store.js'

function narrationLevelForStep(step: FixStepModel): FixNarrationLevel {
  if (step.risk === 'dangerous') return 'warning'
  return 'progress'
}

export function describeFixStep(step: Pick<FixStepModel, 'title' | 'command' | 'risk'>): Omit<FixNarrationItem, 'id' | 'timestamp'> {
  const command = String(step.command || '').trim()
  const lower = command.toLowerCase()

  if (/\b(npm|pnpm|yarn|bun)\s+(install|add)\b/.test(lower)) {
    return {
      title: 'Installing dependencies…',
      description: 'Resolving and installing the packages this project is missing.',
      level: narrationLevelForStep(step as FixStepModel),
    }
  }

  if (/\b(build|tsc|vite build|next build|webpack|turbo build)\b/.test(lower)) {
    return {
      title: 'Building project…',
      description: 'Compiling the project and checking whether the repair cleared the build.',
      level: 'progress',
    }
  }

  if (/\b(dev|start|serve)\b/.test(lower)) {
    return {
      title: 'Starting development server…',
      description: 'Launching the local environment to confirm the project runs again.',
      level: 'progress',
    }
  }

  if (/(tsconfig|package\.json|vite\.config|next\.config|config)/.test(lower)) {
    return {
      title: 'Fixing configuration…',
      description: 'Updating project configuration so the workspace can build or run cleanly.',
      level: narrationLevelForStep(step as FixStepModel),
    }
  }

  return {
    title: step.title || 'Running repair step…',
    description: command || undefined,
    level: narrationLevelForStep(step as FixStepModel),
  }
}

export function interpretExecutionOutput(chunk: string): Omit<FixNarrationItem, 'id' | 'timestamp'> | null {
  const text = String(chunk || '').trim()
  if (!text) return null
  const lower = text.toLowerCase()

  if (lower.includes('added ') && lower.includes('package')) {
    return {
      title: 'Dependencies installed successfully',
      description: 'The package manager finished applying the dependency repair.',
      level: 'success',
    }
  }

  if (
    lower.includes('compiled successfully') ||
    lower.includes('build successful') ||
    lower.includes('build completed')
  ) {
    return {
      title: 'Build completed successfully',
      description: 'The repaired project compiled without the earlier blocker.',
      level: 'success',
    }
  }

  if (lower.includes('listening on') || lower.includes('ready in') || lower.includes('local: http')) {
    return {
      title: 'Development server is responding',
      description: 'The local runtime is back up and reporting a reachable endpoint.',
      level: 'success',
    }
  }

  if (lower.includes('error') || lower.includes('failed')) {
    return {
      title: 'Encountered an error',
      description: text.slice(0, 180),
      level: 'error',
    }
  }

  return null
}

export function appendNarration(
  existing: FixNarrationItem[] | undefined,
  next: Omit<FixNarrationItem, 'id' | 'timestamp'>,
  key: string,
  maxItems = 8
): FixNarrationItem[] {
  const items = Array.isArray(existing) ? existing : []
  const last = items[items.length - 1]
  if (last && last.title === next.title && last.description === next.description && last.level === next.level) {
    return items
  }

  const narration: FixNarrationItem = {
    id: `${key}:${Date.now()}:${items.length}`,
    timestamp: Date.now(),
    ...next,
  }

  const merged = [...items, narration]
  return merged.slice(Math.max(0, merged.length - maxItems))
}
