import fs from "node:fs";

export function readTailLines(filePath: string, maxLines: number): string {
  try {
    if (!fs.existsSync(filePath)) return "";
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    const start = Math.max(0, lines.length - Math.max(1, maxLines));
    return lines.slice(start).join("\n");
  } catch {
    return "";
  }
}
