export abstract class BaseTool<T = any> {
  abstract execute(args?: any): Promise<T>

  protected handleError(err: unknown) {
    console.error('Tool execution error:', err)
    return { success: false, error: err }
  }
}
