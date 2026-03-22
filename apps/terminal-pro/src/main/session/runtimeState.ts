export function createRuntimeSessionState() {
  return {
    id: `session_${Date.now()}`,
    startTime: new Date().toISOString(),
    entries: [],
    playbookResults: new Map(),
  }
}
