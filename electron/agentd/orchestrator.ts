import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { AgentExecutor } from './executor';
import { ReceiptGenerator } from './receipts';
import { DataStore } from '../store/datastore';
import { Run, RunStatus, AgentMode, ExecutionReceipt } from '../../shared/contracts';

export class AgentOrchestrator extends EventEmitter {
  private executor: AgentExecutor;
  private receiptGen: ReceiptGenerator;
  private activeRuns: Map<string, Run> = new Map();
  private dataStore: DataStore;

  constructor(dataStore: DataStore) {
    super();
    this.dataStore = dataStore;
    this.executor = new AgentExecutor();
    this.receiptGen = new ReceiptGenerator();
  }

  async initialize(): Promise<void> {
    console.log('[AgentOrchestrator] Initializing...');
    await this.executor.initialize();
    
    // Load any pending runs from database
    const pendingRuns = await this.dataStore.getRuns({ status: 'pending' });
    for (const run of pendingRuns) {
      this.activeRuns.set(run.id, run);
    }
    
    console.log(`[AgentOrchestrator] Loaded ${pendingRuns.length} pending runs`);
  }

  async createRun(prompt: string, mode: AgentMode = 'local'): Promise<Run> {
    const run: Run = {
      id: uuidv4(),
      prompt,
      status: 'pending',
      mode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      receipts: [],
    };

    await this.dataStore.saveRun(run);
    this.activeRuns.set(run.id, run);

    // Start execution asynchronously
    this.executeRun(run.id).catch(err => {
      console.error(`[AgentOrchestrator] Run ${run.id} failed:`, err);
    });

    return run;
  }

  async getRun(id: string): Promise<Run | null> {
    return this.dataStore.getRun(id);
  }

  async listRuns(): Promise<Run[]> {
    return this.dataStore.getRuns({});
  }

  async cancelRun(id: string): Promise<boolean> {
    const run = this.activeRuns.get(id);
    if (!run) return false;

    run.status = 'cancelled';
    run.updatedAt = new Date().toISOString();
    
    await this.dataStore.updateRun(id, { status: 'cancelled', updatedAt: run.updatedAt });
    await this.executor.cancel(id);
    
    this.emit('run:cancelled', run);
    return true;
  }

  async recoverRun(id: string): Promise<Run | null> {
    const run = await this.dataStore.getRun(id);
    if (!run) return null;

    // Analyze receipts to determine recovery point
    const lastSuccessfulReceipt = run.receipts
      .filter(r => r.status === 'success')
      .pop();

    // Create recovery run
    const recoveryPrompt = `[RECOVERY] Resume from: ${lastSuccessfulReceipt?.action || 'start'}\n${run.prompt}`;
    return this.createRun(recoveryPrompt, run.mode);
  }

  private async executeRun(runId: string): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (!run) return;

    run.status = 'running';
    run.updatedAt = new Date().toISOString();
    await this.dataStore.updateRun(runId, { status: 'running', updatedAt: run.updatedAt });
    this.emit('run:started', run);

    try {
      // Execute via agent executor
      const result = await this.executor.execute({
        id: runId,
        prompt: run.prompt,
        mode: run.mode,
        onReceipt: async (receipt: ExecutionReceipt) => {
          run.receipts.push(receipt);
          await this.dataStore.saveReceipt(receipt);
          this.emit('run:receipt', { runId, receipt });
        },
        onProgress: (progress: string) => {
          this.emit('run:progress', { runId, progress });
        },
      });

      run.status = 'completed';
      run.output = result.output;
      run.updatedAt = new Date().toISOString();
      
      await this.dataStore.updateRun(runId, {
        status: 'completed',
        output: result.output,
        updatedAt: run.updatedAt,
      });
      
      this.emit('run:completed', run);
    } catch (error: any) {
      run.status = 'failed';
      run.error = error.message;
      run.updatedAt = new Date().toISOString();
      
      await this.dataStore.updateRun(runId, {
        status: 'failed',
        error: error.message,
        updatedAt: run.updatedAt,
      });
      
      this.emit('run:failed', run);
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  getAgentStatus() {
    return {
      available: this.executor.isAvailable(),
      mode: 'local' as AgentMode,
      version: '0.1.0',
      activeRuns: this.activeRuns.size,
    };
  }

  async diagnostic(): Promise<any> {
    return {
      orchestrator: {
        activeRuns: this.activeRuns.size,
        pendingTasks: Array.from(this.activeRuns.keys()),
      },
      executor: await this.executor.diagnostic(),
      dataStore: await this.dataStore.diagnostic(),
    };
  }

  async shutdown(): Promise<void> {
    console.log('[AgentOrchestrator] Shutting down...');
    await this.executor.shutdown();
  }
}
