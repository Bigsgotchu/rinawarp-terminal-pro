import fs from 'fs'
import path from 'path'

export type WorkspaceType = 'nextjs' | 'react' | 'node' | 'python' | 'rust' | 'go' | 'unknown'

export function detectWorkspace(root: string): { type: WorkspaceType } {
  const has = (p: string) => fs.existsSync(path.join(root, p))

  try {
    // Check for package.json based projects
    if (has('package.json')) {
      const pkgPath = path.join(root, 'package.json')
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

      if (pkg.dependencies?.next) return { type: 'nextjs' }
      if (pkg.dependencies?.react) return { type: 'react' }
      return { type: 'node' }
    }

    // Check for Python projects
    if (has('pyproject.toml') || has('requirements.txt') || has('Pipfile')) {
      return { type: 'python' }
    }

    // Check for Rust projects
    if (has('Cargo.toml')) {
      return { type: 'rust' }
    }

    // Check for Go projects
    if (has('go.mod')) {
      return { type: 'go' }
    }

    return { type: 'unknown' }
  } catch (error) {
    console.warn('Error detecting workspace:', error)
    return { type: 'unknown' }
  }
}
