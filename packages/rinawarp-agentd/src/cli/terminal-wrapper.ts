/**
 * RinaWarp Terminal Wrapper
 *
 * The CLI entry point that intercepts commands and routes to AI.
 *
 * Usage:
 *   rinawarp "find large files"
 *   rinawarp --explain "git push failed"
 *   rinawarp --deploy staging
 */

import { parseArgs } from 'node:util'
import { collectRepoContext, collectSystemContext, generateContextHints } from '../platform/context-collector.js'
import { translateToCommand } from '../platform/command-translator.js'
import { explainError } from '../platform/error-explainer.js'
import { getConfigFromEnv } from '../platform/llm.js'
import { run } from '@rinawarp/tools/terminal'
import * as readline from 'node:readline'

interface CliOptions {
  explain?: boolean
  dryRun?: boolean
  interactive?: boolean
  config?: string
}

interface MainArgs {
  command?: string
  positional: string[]
}

/**
 * Main CLI entry point
 */
export async function rinawarpCli(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      explain: { type: 'boolean', short: 'e', description: 'Explain an error' },
      dryRun: { type: 'boolean', short: 'n', description: 'Show command without executing' },
      interactive: { type: 'boolean', short: 'i', description: 'Interactive mode' },
      config: { type: 'string', short: 'c', description: 'Config file path' },
      help: { type: 'boolean', short: 'h', description: 'Show help' },
    },
    allowPositionals: true,
  })

  if (values.help) {
    printHelp()
    return
  }

  const config = getConfigFromEnv()
  if (!config) {
    console.error('Error: No LLM API key found.')
    console.error('Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.')
    process.exit(1)
  }

  const cwd = process.cwd()

  // Get context
  const [repoCtx, systemCtx] = await Promise.all([collectRepoContext(cwd), collectSystemContext()])

  const contextHints = generateContextHints(repoCtx)

  // Handle --explain flag
  if (values.explain && positionals.length > 0) {
    const errorOutput = positionals.join(' ')
    console.log('🔍 Analyzing error...\n')

    const explanation = await explainError(config, {
      command: '',
      errorOutput,
      workingDirectory: cwd,
    })

    console.log('📋 Analysis:', explanation.analysis)
    console.log('\n💡 Likely cause:', explanation.likelyCause)
    console.log('\n🔧 Suggested fix:', explanation.suggestedFix)

    if (explanation.commands.length > 0) {
      console.log('\n📝 Commands to try:')
      for (const cmd of explanation.commands) {
        console.log(`   ${cmd}`)
      }
    }

    return
  }

  // Get user input
  const userInput = positionals.join(' ') || (values.interactive ? await promptUser() : '')

  if (!userInput) {
    console.log('RinaWarp - AI Terminal Assistant')
    console.log('Usage: rinawarp [options] "your request"')
    console.log('\nExamples:')
    console.log('  rinawarp "find large files"')
    console.log('  rinawarp --explain "git push failed"')
    console.log('  rinawarp -i')
    console.log('\nRun with --help for more options.')
    return
  }

  console.log(`🤔 "${userInput}"\n`)

  // Translate to command
  const result = await translateToCommand(config, {
    userInput,
    os: systemCtx.os.toLowerCase().includes('mac')
      ? 'darwin'
      : systemCtx.os.toLowerCase().includes('win')
        ? 'win32'
        : 'linux',
    shell: process.env.SHELL?.split('/').pop() || 'bash',
    context: {
      workingDirectory: cwd,
      gitBranch: repoCtx.gitBranch,
      packageManager: repoCtx.packageManager as 'npm' | 'yarn' | 'pnpm' | 'cargo' | 'pip' | undefined,
      dockerAvailable: repoCtx.hasDockerfile,
    },
  })

  // Show result
  console.log('📝 Suggested command:')
  console.log(`   ${result.command}`)
  console.log(`\n💭 ${result.explanation}`)
  console.log(`\n⚠️  Risk: ${result.risk} | Confidence: ${Math.round(result.confidence * 100)}%`)

  // Dry run - don't execute
  if (values.dryRun) {
    console.log('\n🔍 Dry run mode - not executing.')
    return
  }

  // Ask for confirmation
  const confirmed = await confirm('Run this command?')

  if (!confirmed) {
    console.log('❌ Cancelled.')
    return
  }

  // Execute
  console.log('\n🚀 Executing...\n')
  const execResult = await run(result.command, { cwd, timeoutMs: 120000 })

  console.log(execResult.stdout || execResult.stderr)

  if (execResult.exitCode !== 0 && execResult.exitCode !== null) {
    console.log(`\n⚠️  Command exited with code ${execResult.exitCode}`)

    // Offer to explain
    const explain = await confirm('Would you like me to explain the error?')
    if (explain) {
      const explanation = await explainError(config, {
        command: result.command,
        errorOutput: execResult.stderr || execResult.stdout,
        exitCode: execResult.exitCode ?? undefined,
        workingDirectory: cwd,
      })

      console.log('\n💡', explanation.likelyCause)
      console.log('🔧', explanation.suggestedFix)
    }
  }
}

function printHelp(): void {
  console.log(`
RinaWarp - AI Terminal Assistant

USAGE
  rinawarp [options] [command]

OPTIONS
  -e, --explain     Explain an error message
  -n, --dry-run     Show command without executing
  -i, --interactive Interactive mode
  -c, --config      Config file path
  -h, --help        Show this help

EXAMPLES
  rinawarp "find all .js files modified today"
  rinawarp --explain "error: failed to push some refs"
  rinawarp --deploy staging

ENVIRONMENT
  OPENAI_API_KEY      OpenAI API key
  ANTHROPIC_API_KEY  Anthropic API key
`)
}

function promptUser(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('> ', (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${question} (y/n) `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

// Run if called directly
const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  rinawarpCli(process.argv.slice(2)).catch(console.error)
}
