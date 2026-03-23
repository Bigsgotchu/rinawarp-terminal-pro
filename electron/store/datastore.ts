import { MongoClient, Db, Collection } from 'mongodb';
import { Run, ExecutionReceipt } from '../../shared/contracts';

export class DataStore {
  private client: MongoClient;
  private db: Db | null = null;
  private runs: Collection<Run> | null = null;
  private receipts: Collection<ExecutionReceipt> | null = null;

  constructor() {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
    this.client = new MongoClient(mongoUrl);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db('rinawarp_terminal');
      this.runs = this.db.collection<Run>('runs');
      this.receipts = this.db.collection<ExecutionReceipt>('receipts');

      // Create indexes
      await this.runs.createIndex({ createdAt: -1 });
      await this.runs.createIndex({ status: 1 });
      await this.receipts.createIndex({ runId: 1 });

      console.log('[DataStore] Connected to MongoDB');
    } catch (error) {
      console.error('[DataStore] Failed to connect:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async saveRun(run: Run): Promise<void> {
    if (!this.runs) throw new Error('DataStore not connected');
    await this.runs.insertOne(run as any);
  }

  async getRun(id: string): Promise<Run | null> {
    if (!this.runs) throw new Error('DataStore not connected');
    return await this.runs.findOne({ id } as any, { projection: { _id: 0 } }) as Run | null;
  }

  async getRuns(filter: Partial<Run>): Promise<Run[]> {
    if (!this.runs) throw new Error('DataStore not connected');
    return await this.runs
      .find(filter as any, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray() as Run[];
  }

  async updateRun(id: string, update: Partial<Run>): Promise<void> {
    if (!this.runs) throw new Error('DataStore not connected');
    await this.runs.updateOne({ id } as any, { $set: update });
  }

  async saveReceipt(receipt: ExecutionReceipt): Promise<void> {
    if (!this.receipts) throw new Error('DataStore not connected');
    await this.receipts.insertOne(receipt as any);
  }

  async getReceipts(runId: string): Promise<ExecutionReceipt[]> {
    if (!this.receipts) throw new Error('DataStore not connected');
    return await this.receipts
      .find({ runId } as any, { projection: { _id: 0 } })
      .sort({ timestamp: 1 })
      .toArray() as ExecutionReceipt[];
  }

  async diagnostic(): Promise<any> {
    if (!this.db) return { connected: false };
    
    const runsCount = await this.runs?.countDocuments() || 0;
    const receiptsCount = await this.receipts?.countDocuments() || 0;

    return {
      connected: true,
      database: this.db.databaseName,
      collections: {
        runs: runsCount,
        receipts: receiptsCount,
      },
    };
  }
}
