import type { RinaIntent } from '../intent/index.js'

export type RinaAction = {
  intent: RinaIntent

  transactionId?: string

  requiresApproval: boolean

  policyLevel:
    | 'safe'
    | 'moderate'
    | 'sensitive'
    | 'critical'
}
