import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { ExecutionReceipt, AgentMode } from '../../shared/contracts';

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

export class AgentExecutor extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map();
  private available: boolean = false;

  async initialize(): Promise<void> {
    console.log('[AgentExecutor] Initializing local agent executor...');
    // Check if required tools are available
    this.available = true;
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const { id, prompt, mode, onReceipt, onProgress } = options;

    if (mode === 'remote') {
      return this.executeRemote(options);
    }

    return this.executeLocal(options);
  }

  private async executeLocal(options: ExecutionOptions): Promise<ExecutionResult> {
    const { id, prompt, onReceipt, onProgress } = options;
    const receipts: ExecutionReceipt[] = [];
    let output = '';

    // Generate initial receipt
    const startReceipt = this.createReceipt(id, 'execution:start', 'success', `Started: ${prompt.slice(0, 50)}...`);
    receipts.push(startReceipt);
    onReceipt?.(startReceipt);

    try {
      // Parse prompt to determine task type
      const taskType = this.parseTaskType(prompt);
      
      onProgress?.(`Executing ${taskType} task...`);

      // Simulate agent work (replace with actual agent logic)
      // For MVP, this is a placeholder that demonstrates the receipt pattern
      const steps = this.planExecution(prompt, taskType);
      
      for (const step of steps) {
        onProgress?.(`Step: ${step}`);
        
        // Execute step (placeholder)
        await this.executeStep(step);
        
        // Generate receipt for step
        const stepReceipt = this.createReceipt(
          id,
          `execution:${step}`,
          'success',
          `Completed: ${step}`
        );
        receipts.push(stepReceipt);
        onReceipt?.(stepReceipt);
        
        output += `✓ ${step}\n`;
      }

      // Generate completion receipt
      const completeReceipt = this.createReceipt(
        id,
        'execution:complete',
        'success',
        'Task completed successfully'
      );
      receipts.push(completeReceipt);
      onReceipt?.(completeReceipt);

      return { output, receipts };
    } catch (error: any) {
      const errorReceipt = this.createReceipt(
        id,
        'execution:error',
        'error',
        error.message
      );
      receipts.push(errorReceipt);
      onReceipt?.(errorReceipt);
      
      throw error;
    }
  }

  private async executeRemote(options: ExecutionOptions): Promise<ExecutionResult> {
    // Placeholder for remote execution
    throw new Error('Remote execution not yet implemented');
  }

  private parseTaskType(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('build')) return 'build';
    if (lower.includes('test')) return 'test';
    if (lower.includes('deploy')) return 'deploy';
    if (lower.includes('code') || lower.includes('generate')) return 'code';
    return 'general';
  }

  private planExecution(prompt: string, taskType: string): string[] {
    // Simple planning logic (expand based on task type)
    const basePlan = ['analyze', 'prepare', 'execute', 'verify'];
    
    switch (taskType) {
      case 'build':
        return ['check_dependencies', 'compile', 'bundle', 'verify_output'];
      case 'test':
        return ['setup_env', 'run_tests', 'collect_results', 'generate_report'];
      case 'deploy':
        return ['validate_build', 'prepare_artifacts', 'upload', 'verify_deployment'];
      case 'code':
        return ['analyze_requirements', 'generate_code', 'lint', 'test'];
      default:
        return basePlan;
    }
  }

  private async executeStep(step: string): Promise<void> {
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private createReceipt(
    runId: string,
    action: string,
    status: 'success' | 'error',
    output?: string
  ): ExecutionReceipt {
    const timestamp = new Date().toISOString();
    const data = `${runId}:${action}:${timestamp}:${output || ''}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');

    return {
      id: crypto.randomUUID(),
      runId,
      timestamp,
      action,
      status,
      output,
      proof: {
        hash,
      },
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
      activeProcesses: this.processes.size,
      processes: Array.from(this.processes.keys()),
    };
  }

  async shutdown(): Promise<void> {
    for (const [id, process] of this.processes) {
      process.kill();
    }
    this.processes.clear();
  }
}
