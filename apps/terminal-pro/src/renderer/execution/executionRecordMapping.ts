export type { RunBlock } from '@rinawarp/rina-core'

export {
  executionReceiptFromRecord,
  legacyProductRunBlock as runBlockFromExecutionRecord,
  receiptSummaryLine,
  runBlockFromExecutionRecord as canonicalRunBlockFromExecutionRecord,
} from '../../workbench/runBlocks/fromExecutionRecord.js'
