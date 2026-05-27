import { randomUUID } from 'node:crypto'
import type { RinaIntent } from '@rinawarp/rina-core'
import type { RuntimeIngressPort, RuntimeTransaction } from '../ipc/handleIngress.js'
import { RinaMemoryStore } from '../memory/rinaMemoryStore.js'
import { RinaEventStream } from '../stream/rinaEventStream.js'

type RuntimeIngressPortCore = Omit<RuntimeIngressPort, 'memory' | 'stream'>

export class RinaRuntime implements RuntimeIngressPort {
  public memory: RinaMemoryStore
  public stream: RinaEventStream

  constructor(
    private inner: RuntimeIngressPortCore,
    opts?: {
      memory?: RinaMemoryStore
      stream?: RinaEventStream
    },
  ) {
    this.memory = opts?.memory ?? new RinaMemoryStore()
    this.stream = opts?.stream ?? new RinaEventStream()
  }

  evaluatePolicy(intent: RinaIntent) {
    return this.inner.evaluatePolicy(intent)
  }

  async resolveIntent(intent: RinaIntent, context: any): Promise<unknown> {
    if (!this.inner.resolveIntent) return undefined
    return this.inner.resolveIntent(intent, context as any)
  }

  async createTransaction(intent: RinaIntent): Promise<RuntimeTransaction> {
    const created = await this.inner.createTransaction(intent)
    return { ...created, intent }
  }

  async executeTransaction(transaction: RuntimeTransaction): Promise<unknown> {
    const intent = transaction.intent
    try {
      const result = await this.inner.executeTransaction(transaction)

      this.memory.add({
        id: randomUUID(),
        type: 'decision',
        content: { intent, result },
        createdAt: Date.now(),
      })

      const outcome = (result as any)?.transactionOutcome
      if (outcome === 'applied') {
        const intentKey = intent ? `${intent.kind}:${intent.target}` : null
        const repeatedIntentType = intent ? this.memory.countDecisionsForIntent(intent) >= 2 : false
        if (!repeatedIntentType) return result

        const usedStrategy =
          (result as any)?.confirmation ||
          (result as any)?.explanation ||
          (intentKey ? `intent:${intentKey}` : 'applied')

        this.memory.add({
          id: randomUUID(),
          type: 'pattern',
          content: {
            intent,
            intentType: intentKey,
            successStrategy: usedStrategy,
          },
          createdAt: Date.now(),
        })
      }

      if (outcome === 'failed' || outcome === 'rolled_back') {
        this.memory.add({
          id: randomUUID(),
          type: 'failure',
          content: {
            intent,
            error: (result as any)?.explanation || outcome,
          },
          createdAt: Date.now(),
        })
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.memory.add({
        id: randomUUID(),
        type: 'failure',
        content: { intent, error: message },
        createdAt: Date.now(),
      })
      throw err
    }
  }
}

