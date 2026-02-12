export {};

declare global {
  // Add the specific keys you use on globalThis here:
  // Example:
  var RW_DEV: boolean | undefined;
  var RW_SESSION: string | undefined;

  interface Window {
    rina: {
      // Original APIs
      plan(intent: string): Promise<any>;
      execute(): Promise<any>;
      verifyLicense(customerId: string): Promise<any>;

      // Directory picker
      showDirectoryPicker(): Promise<string | null>;

      // Workspace picker (returns path)
      pickWorkspace(): Promise<{ ok: boolean; path?: string }>;

      // Warp-like block APIs
      agentPlan(args: { intentText: string; projectRoot: string }): Promise<any>;
      executePlanStream(args: {
        plan: any[];
        projectRoot: string;
        confirmed: boolean;
        confirmationText: string;
      }): Promise<{ runId: string; planRunId?: string }>;

      // Plan stop API
      stopPlan(planRunId: string): Promise<{ ok: boolean; message?: string }>;

      // Doctor v1: Read-only evidence collection
      doctorPlan(args: { projectRoot: string; symptom: string }): Promise<any>;

      executeStepStream(args: {
        step: { id: string; tool: "terminal"; command: string; risk: "read" | "safe-write" | "high-impact" };
        projectRoot: string;
        confirmed: boolean;
        confirmationText: string;
      }): Promise<{ streamId: string }>;
      cancelStream(streamId: string): Promise<any>;
      onStreamChunk(cb: (p: any) => void): void;
      onStreamEnd(cb: (p: any) => void): void;
      onPlanStepStart(cb: (p: any) => void): void;

      // Plan run events
      onPlanRunStart(cb: (p: { planRunId: string }) => void): void;
      onPlanRunEnd(cb: (p: { planRunId: string; ok: boolean; haltedBecause?: string }) => void): void;
    };
  }
}
