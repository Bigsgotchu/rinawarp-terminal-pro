export type RefreshTask = {
  run: () => void | Promise<void>
  intervalMs: number
}

export type RefreshScheduler = {
  start(): void
  stop(): void
}

export function createRefreshScheduler(tasks: RefreshTask[]): RefreshScheduler {
  let intervalIds: Array<ReturnType<typeof setInterval>> = []
  let started = false

  return {
    start(): void {
      if (started) return
      started = true
      intervalIds = tasks.map((task) => setInterval(() => void task.run(), task.intervalMs))
    },

    stop(): void {
      if (!started) return
      started = false
      intervalIds.forEach((intervalId) => clearInterval(intervalId))
      intervalIds = []
    },
  }
}
