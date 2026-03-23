# RinaWarp Terminal Pro - Monorepo Migration Guide

## Target Structure

```
rinawarp-terminal-pro/
├── apps/
│   ├── terminal-pro/              # Main Electron desktop app
│   │   ├── electron/              # Main process (Node.js/TypeScript)
│   │   │   ├── main.ts
│   │   │   ├── preload.ts
│   │   │   └── ipc/
│   │   ├── renderer/              # UI layer (will be custom TypeScript)
│   │   │   ├── src/
│   │   │   ├── styles/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── website/                   # Marketing & download site
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   └── api/                       # Backend API server
│       ├── server.py
│       ├── requirements.txt
│       └── README.md
├── packages/
│   ├── rinawarp-agentd/          # Agent orchestration (shared)
│   │   ├── src/
│   │   │   ├── orchestrator.ts
│   │   │   ├── executor.ts
│   │   │   ├── receipts.ts
│   │   │   └── tools/
│   │   │       ├── filesystem.ts
│   │   │       ├── git.ts
│   │   │       ├── system.ts
│   │   │       └── deploy.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── rinawarp-contracts/       # Type contracts & IPC definitions
│   │   ├── src/
│   │   │   ├── contracts.ts
│   │   │   ├── validators.ts
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── rinawarp-tools/           # Filesystem, Git, System tools
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── filesystem.ts
│   │   │   ├── git.ts
│   │   │   └── system.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── rinawarp-receipts/        # Receipt generation & verification
│       ├── src/
│       │   ├── generator.ts
│       │   ├── verifier.ts
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
├── cloudflare-worker/            # Update & billing infrastructure
│   ├── src/
│   │   ├── worker.ts
│   │   └── routes/
│   ├── wrangler.toml
│   └── package.json
├── scripts/                      # Build, test, deployment scripts
│   ├── build.sh
│   ├── test.sh
│   ├── deploy-worker.sh
│   └── package-electron.sh
├── tests/                        # E2E & integration tests
│   ├── contract-tests.ts
│   ├── ipc-tests.ts
│   └── e2e/
├── docs/                         # Documentation
│   ├── architecture.md
│   ├── contracts.md
│   └── deployment.md
├── package.json                  # Root workspace config
├── tsconfig.json                 # Base TypeScript config
├── .gitignore
└── README.md
```

## Benefits

### 1. Clear Separation of Concerns
- **apps/**: Deployable applications
- **packages/**: Shared libraries
- **scripts/**: Build & deployment automation
- **tests/**: Testing infrastructure

### 2. Code Reuse
- `rinawarp-agentd` can be used in:
  - Desktop app (local agent)
  - Server deployment (remote agent)
  - CLI tools
- `rinawarp-contracts` ensures type safety across all apps
- `rinawarp-tools` provides consistent tooling

### 3. Independent Versioning
- Each package has its own version
- Apps depend on specific package versions
- Easy to track changes and breaking changes

### 4. Better Testing
- Test packages independently
- Integration tests at workspace root
- Contract tests validate all IPC
- E2E tests for full app

### 5. Simplified Build
- Build packages first, then apps
- Parallel builds where possible
- Clear dependency graph

## Migration Steps

### Phase 1: Extract Packages (Week 1)

1. **Create packages/rinawarp-agentd/**
   ```bash
   mkdir -p packages/rinawarp-agentd/src
   mv electron/agentd/* packages/rinawarp-agentd/src/
   ```

2. **Create packages/rinawarp-contracts/**
   ```bash
   mkdir -p packages/rinawarp-contracts/src
   mv shared/contracts.ts packages/rinawarp-contracts/src/
   mv electron/ipc/contract-validator.ts packages/rinawarp-contracts/src/
   ```

3. **Create packages/rinawarp-tools/**
   ```bash
   mkdir -p packages/rinawarp-tools/src
   mv electron/agentd/tools.ts packages/rinawarp-tools/src/
   ```

4. **Create packages/rinawarp-receipts/**
   ```bash
   mkdir -p packages/rinawarp-receipts/src
   mv electron/agentd/receipts.ts packages/rinawarp-receipts/src/
   ```

### Phase 2: Restructure Apps (Week 2)

1. **Move Electron app to apps/terminal-pro/**
   ```bash
   mkdir -p apps/terminal-pro
   mv electron apps/terminal-pro/
   mv renderer apps/terminal-pro/
   mv package.json apps/terminal-pro/
   ```

2. **Move website to apps/website/**
   ```bash
   mv website apps/website
   ```

3. **Move backend to apps/api/**
   ```bash
   mv backend apps/api
   ```

### Phase 3: Update Dependencies (Week 2)

1. **Root package.json** (workspace config):
   ```json
   {
     "name": "rinawarp-monorepo",
     "private": true,
     "workspaces": [
       "apps/*",
       "packages/*"
     ],
     "scripts": {
       "build": "yarn workspaces run build",
       "test": "yarn workspaces run test",
       "lint": "yarn workspaces run lint"
     }
   }
   ```

2. **Update app dependencies** to use local packages:
   ```json
   {
     "dependencies": {
       "@rinawarp/agentd": "workspace:*",
       "@rinawarp/contracts": "workspace:*",
       "@rinawarp/tools": "workspace:*"
     }
   }
   ```

3. **Update imports**:
   ```typescript
   // Before
   import { AgentOrchestrator } from '../agentd/orchestrator';
   
   // After
   import { AgentOrchestrator } from '@rinawarp/agentd';
   ```

### Phase 4: Testing Infrastructure (Week 3)

1. **Set up contract tests**
2. **Add IPC audit layer**
3. **E2E test suite**
4. **CI/CD pipeline**

### Phase 5: Custom Renderer (Week 4)

1. **Create custom TypeScript renderer**
2. **Remove React dependency**
3. **Implement custom state management**
4. **Add renderer tests**

## Root Package.json

```json
{
  "name": "rinawarp-terminal-pro",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "yarn workspace @rinawarp/terminal-pro dev",
    "build": "yarn workspaces foreach -pt run build",
    "test": "yarn workspaces run test",
    "test:contracts": "yarn workspace @rinawarp/contracts test",
    "lint": "yarn workspaces run lint",
    "package": "yarn workspace @rinawarp/terminal-pro package",
    "deploy:worker": "yarn workspace @rinawarp/cloudflare-worker deploy",
    "deploy:website": "yarn workspace @rinawarp/website deploy"
  },
  "devDependencies": {
    "@types/node": "^20.11.5",
    "typescript": "^5.3.3",
    "prettier": "^3.2.4",
    "eslint": "^8.56.0"
  }
}
```

## Package Scoping

All packages use `@rinawarp` scope:
- `@rinawarp/agentd`
- `@rinawarp/contracts`
- `@rinawarp/tools`
- `@rinawarp/receipts`
- `@rinawarp/terminal-pro` (app)
- `@rinawarp/website` (app)

## Benefits Summary

✅ **Better Organization**: Clear app vs library separation
✅ **Code Reuse**: Shared packages across apps
✅ **Independent Versions**: Each package has its own lifecycle
✅ **Simplified Testing**: Test packages and apps separately
✅ **Parallel Builds**: Build packages in parallel
✅ **Type Safety**: Shared contracts ensure consistency
✅ **Scalability**: Easy to add new apps or packages

## Next Steps

1. **Immediate**: Start with contract validation (DONE)
2. **Week 1**: Extract agentd and tools packages
3. **Week 2**: Restructure apps directory
4. **Week 3**: Add comprehensive testing
5. **Week 4**: Custom renderer implementation

## Notes

- Keep current structure working while migrating
- Use feature branches for each phase
- Test thoroughly after each phase
- Update documentation as you go
- Use `yarn workspaces` for management
