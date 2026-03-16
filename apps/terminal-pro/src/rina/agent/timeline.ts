export type AgentStep = {
  name: string
  status: 'pending' | 'running' | 'done'
}

export class AgentTimeline {
  steps: AgentStep[] = []

  add(name: string) {
    this.steps.push({ name, status: 'pending' })
  }

  start(index: number) {
    if (this.steps[index]) {
      this.steps[index].status = 'running'
    }
  }

  finish(index: number) {
    if (this.steps[index]) {
      this.steps[index].status = 'done'
    }
  }

  getSteps(): AgentStep[] {
    return [...this.steps]
  }

  clear() {
    this.steps = []
  }
}
