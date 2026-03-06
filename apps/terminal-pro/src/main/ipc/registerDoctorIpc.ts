import type { IpcMain } from "electron";

export function registerDoctorIpc(args: {
  ipcMain: IpcMain;
  plan: (args: { projectRoot: string; symptom: string }) => Promise<unknown>;
  inspect: (intent: string) => Promise<unknown>;
  collect: (steps: any[], streamCallback?: unknown) => Promise<unknown>;
  interpret: (payload: { intent: string; evidence: any }) => Promise<unknown>;
  verify: (payload: { intent: string; before: any; after: any; diagnosis?: any }) => Promise<unknown>;
  executeFix: (plan: any, confirmed: boolean, confirmationText: string) => Promise<unknown>;
  transcriptGet: () => Promise<unknown>;
  transcriptExport: (format: "json" | "text") => Promise<unknown>;
}) {
  const { ipcMain } = args;

  ipcMain.handle("rina:doctor:plan", async (_event, payload: { projectRoot: string; symptom: string }) =>
    args.plan(payload),
  );
  ipcMain.handle("rina:doctor:inspect", async (_event, intent: string) => args.inspect(intent));
  ipcMain.handle("rina:doctor:collect", async (_event, steps: any[], streamCallback?: unknown) =>
    args.collect(steps, streamCallback),
  );
  ipcMain.handle("rina:doctor:interpret", async (_event, payload: { intent: string; evidence: any }) =>
    args.interpret(payload),
  );
  ipcMain.handle(
    "rina:doctor:verify",
    async (_event, payload: { intent: string; before: any; after: any; diagnosis?: any }) => args.verify(payload),
  );
  ipcMain.handle("rina:doctor:executeFix", async (_event, plan: any, confirmed: boolean, confirmationText: string) =>
    args.executeFix(plan, confirmed, confirmationText),
  );
  ipcMain.handle("rina:doctor:transcript:get", async () => args.transcriptGet());
  ipcMain.handle("rina:doctor:transcript:export", async (_event, format: "json" | "text") =>
    args.transcriptExport(format),
  );
}
