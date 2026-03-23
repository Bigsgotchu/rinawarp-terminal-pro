import * as crypto from 'crypto';
import { ExecutionReceipt } from '../../shared/contracts';

export class ReceiptGenerator {
  private privateKey?: string;

  constructor() {
    // For MVP, using hash-based proofs
    // Can upgrade to signature-based later
  }

  generateReceipt(
    runId: string,
    action: string,
    status: 'success' | 'error',
    output?: string
  ): ExecutionReceipt {
    const timestamp = new Date().toISOString();
    const id = crypto.randomUUID();

    const data = JSON.stringify({
      id,
      runId,
      timestamp,
      action,
      status,
      output,
    });

    const hash = crypto.createHash('sha256').update(data).digest('hex');

    return {
      id,
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

  verifyReceipt(receipt: ExecutionReceipt): boolean {
    const data = JSON.stringify({
      id: receipt.id,
      runId: receipt.runId,
      timestamp: receipt.timestamp,
      action: receipt.action,
      status: receipt.status,
      output: receipt.output,
    });

    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return hash === receipt.proof.hash;
  }
}
