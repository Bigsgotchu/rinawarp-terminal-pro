import OpenAI from 'openai';
import { spawn, ChildProcess } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ExecutionReceipt, AgentMode } from '../../shared/contracts';
import { FilesystemTools, GitTools, SystemTools, DeployTools, ToolResult } from './tools';

interface ExecutionOptions {
  id: string;
  prompt: string;
  mode: AgentMode;
  onReceipt?: (receipt: ExecutionReceipt) => void;
  onProgress?: (progress: string) => void;
}

interface ExecutionResult {
  output: string;
  receipts: ExecutionReceipt[];
}

interface AgentPlan {
  intent: 'build' | 'test' | 'deploy' | 'self-check' | 'code' | 'help';
  steps: string[];
  commands: Array<{ tool: string; args: any }>;
  explanation: string;
}

/**
 * Real Agent Executor with GPT-5.1 Intelligence
 * 
 * Capabilities:
 * 1. Intent classification (build/test/deploy/self-check/code)
 * 2. Execution planning
 * 3. Tool execution (filesystem, terminal, git)
 * 4. Output interpretation
 * 5. Receipt generation with SHA-256 proofs
 */
export class RealAgentExecutor {
  private openai: OpenAI | null = null;
  private processes: Map<string, ChildProcess> = new Map();
  private workspaceBase: string;
  private available: boolean = false;

  constructor() {
    const apiKey = process.env.EMERGENT_LLM_KEY;
    
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        baseURL: 'https://api.openai.com/v1', // Standard OpenAI endpoint
      });
      this.available = true;
      console.log('[RealAgentExecutor] Initialized with GPT-5.1');
    } else {
      console.warn('[RealAgentExecutor] EMERGENT_LLM_KEY not found - running in fallback mode');
    }

    this.workspaceBase = '/tmp/rinawarp-workspaces';
    if (!fs.existsSync(this.workspaceBase)) {
      fs.mkdirSync(this.workspaceBase, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    console.log('[RealAgentExecutor] Initializing agent executor...');
    // Verify AI connection if available
    if (this.openai) {
      try {
        // Test API connection
        await this.openai.chat.completions.create({
          model: 'gpt-5.1',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        });
        console.log('[RealAgentExecutor] GPT-5.1 connection verified');
      } catch (error: any) {
        console.error('[RealAgentExecutor] Failed to connect to GPT-5.1:', error.message);
        this.available = false;
      }
    }
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const { id, prompt, mode, onReceipt, onProgress } = options;
    const receipts: ExecutionReceipt[] = [];
    let output = '';

    try {
      // Step 1: Generate start receipt
      const startReceipt = this.createReceipt(id, 'execution:start', 'success', `Started: ${prompt.slice(0, 50)}...`);
      receipts.push(startReceipt);
      onReceipt?.(startReceipt);

      // Step 2: Classify intent and create plan
      onProgress?.('Analyzing request with GPT-5.1...');
      const plan = await this.classifyAndPlan(prompt);
      
      const planReceipt = this.createReceipt(
        id,
        'execution:plan',
        'success',
        `Intent: ${plan.intent} | Steps: ${plan.steps.length}`
      );
      receipts.push(planReceipt);
      onReceipt?.(planReceipt);

      // Step 3: Execute based on intent
      switch (plan.intent) {
        case 'build':
          output = await this.executeBuild(id, plan, onProgress, onReceipt, receipts);
          break;
        case 'test':
          output = await this.executeTest(id, plan, onProgress, onReceipt, receipts);
          break;
        case 'deploy':
          output = await this.executeDeploy(id, plan, onProgress, onReceipt, receipts);
          break;
        case 'self-check':
          output = await this.executeSelfCheck(id, plan, onProgress, onReceipt, receipts);
          break;
        case 'code':
          output = await this.executeCodeGeneration(id, prompt, onProgress, onReceipt, receipts);
          break;
        default:
          output = await this.executeHelp(id, prompt, onProgress, onReceipt, receipts);
      }

      // Step 4: Final receipt
      const completeReceipt = this.createReceipt(id, 'execution:complete', 'success', 'Task completed');
      receipts.push(completeReceipt);
      onReceipt?.(completeReceipt);

      return { output, receipts };
    } catch (error: any) {
      const errorReceipt = this.createReceipt(id, 'execution:error', 'error', error.message);
      receipts.push(errorReceipt);
      onReceipt?.(errorReceipt);
      throw error;
    }
  }

  /**
   * Use GPT-5.1 to classify intent and generate execution plan with function calling
   */
  private async classifyAndPlan(prompt: string): Promise<AgentPlan> {
    if (!this.openai) {
      return this.fallbackClassify(prompt);
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [
          {
            role: 'system',
            content: `You are RinaWarp Terminal Pro Agent - a proof-first execution assistant.

Available tools:
- read_file: Read file contents
- write_file: Create/update files
- list_directory: List directory contents
- execute_command: Run shell commands
- git_status: Check git status
- git_commit: Commit changes
- git_diff: View changes

Analyze requests and respond with JSON:
{
  "intent": "build|test|deploy|self-check|code|help",
  "steps": ["step1", "step2"],
  "commands": [{"tool": "tool_name", "args": {}}],
  "explanation": "brief explanation"
}

Be precise and actionable.`,
          },
          {
            role: 'user',
            content: `Analyze and create execution plan:\n\n${prompt}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const plan = JSON.parse(content) as AgentPlan;
      return plan;
    } catch (error: any) {
      console.error('[RealAgentExecutor] AI classification failed:', error.message);
      return this.fallbackClassify(prompt);
    }
  }

  private fallbackClassify(prompt: string): AgentPlan {
    const lower = prompt.toLowerCase();
    
    if (lower.includes('build') || lower.includes('compile')) {
      return {
        intent: 'build',
        steps: ['detect build system', 'run build'],
        commands: [],
        explanation: 'Building project'
      };
    }
    
    if (lower.includes('test')) {
      return {
        intent: 'test',
        steps: ['detect test framework', 'run tests'],
        commands: [],
        explanation: 'Running tests'
      };
    }
    
    if (lower.includes('deploy')) {
      return {
        intent: 'deploy',
        steps: ['prepare deployment', 'upload'],
        commands: [],
        explanation: 'Deploying project'
      };
    }
    
    if (lower.includes('check') || lower.includes('diagnose')) {
      return {
        intent: 'self-check',
        steps: ['verify environment'],
        commands: [],
        explanation: 'Running diagnostics'
      };
    }
    
    if (lower.includes('code') || lower.includes('generate') || lower.includes('create')) {
      return {
        intent: 'code',
        steps: ['generate code'],
        commands: [],
        explanation: 'Generating code'
      };
    }
    
    return {
      intent: 'help',
      steps: ['provide guidance'],
      commands: [],
      explanation: 'Providing help'
    };
  }

  private async executeBuild(
    runId: string,
    plan: AgentPlan,
    onProgress?: (progress: string) => void,
    onReceipt?: (receipt: ExecutionReceipt) => void,
    receipts?: ExecutionReceipt[]
  ): Promise<string> {
    onProgress?.('Detecting build system...');
    
    const workspace = path.join(this.workspaceBase, runId);
    if (!fs.existsSync(workspace)) {
      fs.mkdirSync(workspace, { recursive: true });
    }

    // Detect build system
    let buildCommand = '';
    if (fs.existsSync(path.join(workspace, 'package.json'))) {
      buildCommand = 'yarn build';
    } else if (fs.existsSync(path.join(workspace, 'Makefile'))) {
      buildCommand = 'make';
    } else if (fs.existsSync(path.join(workspace, 'build.sh'))) {
      buildCommand = './build.sh';
    }

    const detectReceipt = this.createReceipt(
      runId,
      'build:detect',
      'success',
      buildCommand || 'No build system found'
    );
    receipts?.push(detectReceipt);
    onReceipt?.(detectReceipt);

    if (!buildCommand) {
      return 'No build system detected. Add package.json, Makefile, or build.sh to your workspace.';
    }

    // Execute build
    onProgress?.(`Building with: ${buildCommand}`);
    const result = await this.runCommand(buildCommand, workspace);

    const buildReceipt = this.createReceipt(
      runId,
      'build:execute',
      result.success ? 'success' : 'error',
      result.output,
      result.error
    );
    receipts?.push(buildReceipt);
    onReceipt?.(buildReceipt);

    return result.output;
  }

  private async executeTest(
    runId: string,
    plan: AgentPlan,
    onProgress?: (progress: string) => void,
    onReceipt?: (receipt: ExecutionReceipt) => void,
    receipts?: ExecutionReceipt[]
  ): Promise<string> {
    onProgress?.('Running tests...');
    
    const workspace = path.join(this.workspaceBase, runId);
    
    // Try common test commands
    const testCommands = ['yarn test', 'npm test', 'pytest', 'make test'];
    
    for (const cmd of testCommands) {
      const result = await this.runCommand(cmd, workspace);
      if (result.success) {
        const testReceipt = this.createReceipt(runId, 'test:run', 'success', result.output);
        receipts?.push(testReceipt);
        onReceipt?.(testReceipt);
        return result.output;
      }
    }

    return 'No test runner found. Configure tests in package.json or add pytest.';
  }

  private async executeDeploy(
    runId: string,
    plan: AgentPlan,
    onProgress?: (progress: string) => void,
    onReceipt?: (receipt: ExecutionReceipt) => void,
    receipts?: ExecutionReceipt[]
  ): Promise<string> {
    onProgress?.('Preparing deployment...');
    
    const deployReceipt = this.createReceipt(
      runId,
      'deploy:prepare',
      'success',
      'Deployment workflow requires configuration'
    );
    receipts?.push(deployReceipt);
    onReceipt?.(deployReceipt);

    return 'Deploy: Configure your deployment target (Vercel, Cloudflare Workers, Docker, VPS)';
  }

  private async executeSelfCheck(
    runId: string,
    plan: AgentPlan,
    onProgress?: (progress: string) => void,
    onReceipt?: (receipt: ExecutionReceipt) => void,
    receipts?: ExecutionReceipt[]
  ): Promise<string> {
    onProgress?.('Running self-check...');
    
    const checks: string[] = [];
    const workspace = path.join(this.workspaceBase, runId);

    // Check Node.js
    const nodeResult = await this.runCommand('node --version', workspace);
    checks.push(nodeResult.success ? `✓ Node.js: ${nodeResult.output.trim()}` : '✗ Node.js: not found');

    // Check Python
    const pythonResult = await this.runCommand('python3 --version', workspace);
    checks.push(pythonResult.success ? `✓ Python: ${pythonResult.output.trim()}` : '✗ Python: not found');

    // Check Git
    const gitResult = await this.runCommand('git --version', workspace);
    checks.push(gitResult.success ? `✓ Git: ${gitResult.output.trim()}` : '✗ Git: not found');

    // Check AI availability
    checks.push(this.openai ? '✓ AI: GPT-5.1 available' : '✗ AI: Not configured');

    const output = checks.join('\n');
    
    const checkReceipt = this.createReceipt(runId, 'selfcheck:run', 'success', output);
    receipts?.push(checkReceipt);
    onReceipt?.(checkReceipt);

    return output;
  }

  private async executeCodeGeneration(
    runId: string,
    prompt: string,
    onProgress?: (progress: string) => void,
    onReceipt?: (receipt: ExecutionReceipt) => void,
    receipts?: ExecutionReceipt[]
  ): Promise<string> {
    if (!this.openai) {
      return 'Code generation requires AI. Set EMERGENT_LLM_KEY in environment.';
    }

    onProgress?.('Generating code with GPT-5.1...');

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5.1',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code generator. Provide production-ready, well-documented code with file names and explanations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      const code = completion.choices[0].message.content || 'No code generated';

      const codeReceipt = this.createReceipt(runId, 'code:generate', 'success', 'Code generated successfully');
      receipts?.push(codeReceipt);
      onReceipt?.(codeReceipt);

      return code;
    } catch (error: any) {
      const errorReceipt = this.createReceipt(runId, 'code:generate', 'error', error.message);
      receipts?.push(errorReceipt);
      onReceipt?.(errorReceipt);
      throw error;
    }
  }

  private async executeHelp(
    runId: string,
    prompt: string,
    onProgress?: (progress: string) => void,
    onReceipt?: (receipt: ExecutionReceipt) => void,
    receipts?: ExecutionReceipt[]
  ): Promise<string> {
    onProgress?.('Analyzing request...');

    const helpText = `RinaWarp Terminal Pro Agent

I can help you with:
• Build: Compile and bundle projects
• Test: Run test suites
• Deploy: Deploy to various platforms
• Self-Check: Verify environment and diagnose issues
• Code: Generate or modify code files

Your request: "${prompt}"

What would you like me to do?`;

    const helpReceipt = this.createReceipt(runId, 'help:provide', 'success', 'Help provided');
    receipts?.push(helpReceipt);
    onReceipt?.(helpReceipt);

    return helpText;
  }

  private async runCommand(command: string, cwd: string): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      const proc = spawn(command, {
        cwd,
        shell: true,
        timeout: 60000,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout,
          error: code !== 0 ? stderr : undefined,
        });
      });

      proc.on('error', (error) => {
        resolve({
          success: false,
          output: '',
          error: error.message,
        });
      });
    });
  }

  private createReceipt(
    runId: string,
    action: string,
    status: 'success' | 'error',
    output?: string,
    error?: string
  ): ExecutionReceipt {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const data = `${id}:${runId}:${action}:${timestamp}:${output || ''}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');

    return {
      id,
      runId,
      timestamp,
      action,
      status,
      output,
      error,
      proof: { hash },
    };
  }

  async cancel(runId: string): Promise<void> {
    const process = this.processes.get(runId);
    if (process) {
      process.kill();
      this.processes.delete(runId);
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async diagnostic(): Promise<any> {
    return {
      available: this.available,
      model: this.openai ? 'gpt-5.1' : 'fallback',
      workspace: this.workspaceBase,
      activeProcesses: this.processes.size,
    };
  }

  async shutdown(): Promise<void> {
    console.log('[RealAgentExecutor] Shutting down...');
    for (const [id, process] of this.processes) {
      process.kill();
    }
    this.processes.clear();
  }
}
