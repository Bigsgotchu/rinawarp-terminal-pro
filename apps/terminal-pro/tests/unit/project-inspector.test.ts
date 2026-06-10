import { describe, expect, it } from 'vitest'

import { inspectProjectWorkspace } from '../../src/main/memory/projectInspector.js'

describe('inspectProjectWorkspace', () => {
  it('detects pnpm package manager from lockfile', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['pnpm-lock.yaml', 'package.json', 'src/index.ts'],
      readFile: async (path) => path === 'package.json' ? '{"name": "test"}' : null,
    })

    expect(result.packageManager).toBe('pnpm')
    expect(result.facts.some(f => f.key === 'package.manager' && f.value === 'pnpm')).toBe(true)
  })

  it('detects npm package manager from lock file', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['package-lock.json', 'package.json'],
      readFile: async (path) => path === 'package.json' ? '{"name": "test"}' : null,
    })

    expect(result.packageManager).toBe('npm')
  })

  it('detects yarn package manager from lockfile', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['yarn.lock', 'package.json'],
      readFile: async (path) => path === 'package.json' ? '{"name": "test"}' : null,
    })

    expect(result.packageManager).toBe('yarn')
  })

  it('detects bun package manager from lock file', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['bun.lock', 'package.json'],
      readFile: async (path) => path === 'package.json' ? '{"name": "test"}' : null,
    })

    expect(result.packageManager).toBe('bun')
  })

  it('detects React framework from dependencies', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['package.json'],
      readFile: async (path) => path === 'package.json'
        ? '{"dependencies": {"react": "^18.0.0"}, "devDependencies": {"vite": "^5.0.0"}}'
        : null,
    })

    expect(result.frameworks).toContain('react')
  })

  it('detects Vite framework from vite.config', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['vite.config.ts', 'package.json'],
      readFile: async (path) => path === 'package.json'
        ? '{"dependencies": {}, "devDependencies": {"react": "^18.0.0"}}'
        : null,
    })

    expect(result.frameworks).toContain('vite')
  })

  it('detects Electron project from electron dependency', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['package.json'],
      readFile: async (path) => path === 'package.json'
        ? '{"dependencies": {"electron": "^28.0.0"}}'
        : null,
    })

    expect(result.isElectron).toBe(true)
  })

  it('detects Electron project from electron-builder config', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['electron-builder.yml', 'package.json'],
      readFile: async (path) => path === 'package.json' ? '{"dependencies": {}}' : null,
    })

    expect(result.isElectron).toBe(true)
    expect(result.canDeploy).toBe(true)
  })

  it('detects auth packages from dependencies', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['package.json'],
      readFile: async (path) => path === 'package.json'
        ? '{"dependencies": {"@clerk/nextjs": "^5.0.0", "next-auth": "^4.0.0"}}'
        : null,
    })

    expect(result.authPackages).toContain('@clerk/nextjs')
    expect(result.authPackages).toContain('next-auth')
    expect(result.facts.some(f => f.key === 'auth.provider')).toBe(true)
  })

  it('detects database packages from dependencies', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['package.json'],
      readFile: async (path) => path === 'package.json'
        ? '{"dependencies": {"prisma": "^5.0.0", "better-sqlite3": "^9.0.0"}}'
        : null,
    })

    expect(result.databasePackages).toContain('prisma')
    expect(result.databasePackages).toContain('better-sqlite3')
    expect(result.facts.some(f => f.key === 'database.primary')).toBe(true)
  })

  it('detects multiple deployment targets', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['Dockerfile', 'vercel.json', 'netlify.toml', 'package.json'],
      readFile: async (path) => path === 'package.json'
        ? '{"scripts": {"deploy": "vercel --prod"}}'
        : null,
    })

    expect(result.canDeploy).toBe(true)
  })

  it('detects Next.js framework', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['package.json'],
      readFile: async (path) => path === 'package.json'
        ? '{"dependencies": {"next": "^15.0.0"}}'
        : null,
    })

    expect(result.frameworks).toContain('next')
  })

  it('detects Vue framework', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['package.json'],
      readFile: async (path) => path === 'package.json'
        ? '{"dependencies": {"vue": "^3.0.0"}}'
        : null,
    })

    expect(result.frameworks).toContain('vue')
  })

  it('handles missing package.json gracefully', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => [],
      readFile: async () => null,
    })

    expect(result.packageManager).toBe(null)
    expect(result.framework).toBe(null)
    expect(result.frameworks).toEqual([])
    expect(result.isElectron).toBe(false)
    expect(result.authPackages).toEqual([])
    expect(result.databasePackages).toEqual([])
  })

  it('returns valid WorkspaceFact objects in facts array', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['pnpm-lock.yaml', 'package.json'],
      readFile: async (path) => path === 'package.json'
        ? '{"dependencies": {"react": "^18.0.0"}}'
        : null,
    })

    result.facts.forEach(fact => {
      expect(fact.key).toBeDefined()
      expect(fact.value).toBeDefined()
      expect(fact.category).toBeDefined()
      expect(fact.source).toBeDefined()
      expect(fact.confidence).toBeDefined()
      expect(fact.last_verified_at).toBeDefined()
    })
  })

  it('detects primary framework as first detected', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['package.json'],
      readFile: async (path) => path === 'package.json'
        ? '{"dependencies": {"react": "^18.0.0", "vite": "^5.0.0"}}'
        : null,
    })

    expect(result.frameworks).toContain('react')
    expect(result.frameworks).toContain('vite')
  })

  it('detects Express as Node.js framework', async () => {
    const result = await inspectProjectWorkspace('/fake/project', {
      listFiles: async () => ['package.json'],
      readFile: async (path) => path === 'package.json'
        ? '{"dependencies": {"express": "^4.0.0"}}'
        : null,
    })

    expect(result.frameworks).toContain('express')
  })
})