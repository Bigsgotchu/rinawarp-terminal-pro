import { bubbleBlock } from '../replies/renderFragments.js'
import { WorkbenchStore } from '../workbench/store.js'

export function scrollToRun(runId: string): void {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-run-id="${CSS.escape(runId)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

export function scrollToMessage(messageId: string): void {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-msg-id="${CSS.escape(messageId)}"]`)?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    })
  })
}

export function createRunLinkedMessage(
  store: WorkbenchStore,
  args: { command: string; runId: string; originMessage?: string },
  getWorkspaceKey: (store: WorkbenchStore) => string
): string {
  const messageId = `rina:run:${args.runId}`
  store.dispatch({
    type: 'chat/add',
    msg: {
      id: messageId,
      role: 'rina',
      content: [
        bubbleBlock(
          `I started a run for ${args.command}. Treat the work as in progress until run ${args.runId} has an exit code and receipt you can inspect.`
        ),
      ],
      ts: Date.now(),
      workspaceKey: getWorkspaceKey(store),
      runIds: [args.runId],
    },
  })
  if (args.originMessage) {
    store.dispatch({ type: 'chat/linkRun', messageId: args.originMessage, runId: args.runId })
  }
  return messageId
}
