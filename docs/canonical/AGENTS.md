# RinaWarp Agent Development Guide

Create automation agents for the RinaWarp Terminal Pro marketplace.

## What is an Agent?

An agent is a collection of commands that automate development tasks. Each command contains steps that execute shell commands sequentially.

## Agent Structure

```json
{
  "name": "docker-repair",
  "description": "Fix common Docker environment issues",
  "author": "your-username",
  "version": "1.0.0",
  "permissions": ["docker", "filesystem:write"],
  "commands": [
    {
      "name": "fix",
      "steps": [
        "docker system prune -f",
        "docker volume prune -f",
        "sudo systemctl restart docker"
      ]
    },
    {
      "name": "clean",
      "steps": [
        "docker system prune -a --volumes -f"
      ]
    }
  ],
  "price": 0
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique identifier (kebab-case) |
| `description` | string | Yes | What your agent does |
| `author` | string | Yes | Your username/identifier |
| `version` | string | Yes | Semantic version (1.0.0) |
| `permissions` | string[] | No | Required permissions (e.g., ["docker", "filesystem:write"]) |
| `commands` | array | Yes | List of executable commands |
| `price` | number | No | Price in USD (0 = free) |

### Command Object

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Command identifier |
| `steps` | string[] | Shell commands to execute |

## Creating an Agent

1. Create a JSON file with your agent definition:

```bash
mkdir my-agents
cd my-agents
cat > docker-repair.json << 'EOF'
{
  "name": "docker-repair",
  "description": "Fix Docker environment issues",
  "author": "karina",
  "version": "1.0.0",
  "commands": [
    {
      "name": "fix",
      "steps": [
        "docker system prune -f",
        "sudo systemctl restart docker"
      ]
    }
  ]
}
EOF
```

2. Publish to the marketplace:

```bash
node ../rinawarp-terminal-pro/tools/publish-agent.js docker-repair.json
```

Or use the full URL for local development:

```bash
node ../rinawarp-terminal-pro/tools/publish-agent.js docker-repair.json --api-url http://localhost:5055
```

## CLI Tools

RinaWarp provides several CLI tools in the `tools/` directory:

### Publish Agent

Publish an agent to the marketplace:

```bash
node tools/publish-agent.ts <agent-file.json>
```

Options:
- `--api-url <url>` - Override marketplace API URL

### Install Agent

Install an agent from the marketplace or a local file:

```bash
node tools/install-agent.ts <agent-name or agent-file.json>
```

Examples:
```bash
node tools/install-agent.ts docker-cleanup
node tools/install-agent.ts ./my-agent.json
```

Options:
- `--api-url <url>` - Override marketplace API URL

### List Agents

List available agents from marketplace or local installation:

```bash
node tools/list-agents.ts [options]
```

Options:
- `-l, --local` - Show only locally installed agents
- `-m, --marketplace` - Show only marketplace agents
- `-d, --details` - Show detailed command information
- `--api-url <url>` - Override marketplace API URL

## Example Agents

### Docker Repair Agent

```json
{
  "name": "docker-repair",
  "description": "Fix Docker environments",
  "author": "karina",
  "version": "1.0.0",
  "commands": [
    {
      "name": "fix",
      "steps": [
        "docker system prune -f",
        "sudo systemctl restart docker"
      ]
    },
    {
      "name": "clean",
      "steps": [
        "docker system prune -a -f",
        "docker volume prune -f"
      ]
    }
  ]
}
```

### Git Cleanup Agent

```json
{
  "name": "git-cleanup",
  "description": "Clean up git branches and artifacts",
  "author": "karina",
  "version": "1.0.0",
  "commands": [
    {
      "name": "branches",
      "steps": [
        "git fetch -p",
        "git branch -vv | grep ': gone]' | awk '{print $1}' | xargs -r git branch -d"
      ]
    },
    {
      "name": "logs",
      "steps": [
        "git reflog expire --expire=30days --all",
        "git gc --prune=30days --aggressive"
      ]
    }
  ]
}
```

### NPM Cache Cleaner

```json
{
  "name": "npm-cleaner",
  "description": "Clean npm cache and node_modules",
  "author": "karina",
  "version": "1.0.0",
  "commands": [
    {
      "name": "deep-clean",
      "steps": [
        "rm -rf node_modules package-lock.json",
        "npm cache clean --force",
        "npm install"
      ]
    }
  ]
}
```

## Using Agents

### Install an Agent

```bash
rina install docker-repair
```

### Run an Agent

```bash
rina run docker-repair fix
```

### List Commands

```bash
rina run docker-repair
```

### List Installed Agents

```bash
rina plugins
```

### Browse Marketplace

```bash
rina market
```

Or visit: https://rinawarptech.com/agents

## Pricing Your Agents

Set a price (in USD) to monetize your agents:

```json
{
  "name": "enterprise-fix",
  "description": "Advanced fixes for enterprise systems",
  "author": "karina",
  "version": "1.0.0",
  "commands": [...],
  "price": 19
}
```

The marketplace handles Stripe checkout. You receive 70% of revenue, RinaWarp takes 30%.

## Best Practices

1. **Keep commands simple** - Each step should do one thing
2. **Add error handling** - Use commands that fail gracefully
3. **Test locally** - Run your steps manually before publishing
4. **Document well** - Clear descriptions help users understand
5. **Version semantically** - Use proper version numbers (1.0.0, 1.0.1, etc.)
6. **Declare permissions** - Always specify required permissions for security

## Permissions Reference

Agents can declare the following permissions:

| Permission | Description |
|------------|-------------|
| `docker` | Access to Docker daemon |
| `npm` | Run npm commands |
| `filesystem:read` | Read from filesystem |
| `filesystem:write` | Write to filesystem |
| `network` | Make network requests |
| `process` | Spawn child processes |

Example with permissions:

```json
{
  "name": "docker-cleanup",
  "description": "Clean up Docker resources",
  "author": "karina",
  "version": "1.0.0",
  "permissions": ["docker", "filesystem:write"],
  "commands": [...]
}
```

## Troubleshooting

### Agent not found
- Check the name matches exactly (case-sensitive)
- Verify the agent exists in the marketplace

### Installation failed
- Check your internet connection
- Verify JSON is valid

### Command failed
- Run the command manually to see the error
- Check that the command exists in your system

## Support

- GitHub Issues: https://github.com/rinawarptech/rinawarp-terminal-pro/issues
- Discord: https://discord.gg/rinawarptech
- Email: support@rinawarptech.com

## Plugins

RinaWarp plugins are located in `packages/rinawarp-plugins/`. Each plugin provides additional tools and capabilities:

### Structure

```
packages/rinawarp-plugins/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # Exports all plugins
    ├── types.ts        # Plugin type definitions
    └── dockerPlugin.ts # Docker plugin implementation
```

### Creating a Plugin

Plugins must implement the `RinaPlugin` interface:

```typescript
import { RinaPlugin, PluginContext } from './types.js';

const myPlugin: RinaPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  
  async activate(ctx: PluginContext): Promise<void> {
    // Register tools and agents
    ctx.registerTool('myTool', new MyTool());
  },
  
  async deactivate(): Promise<void> {
    // Cleanup
  }
};

export default myPlugin;
```

### Available Plugins

- **docker-plugin** - Docker container management tools and AI coder agent