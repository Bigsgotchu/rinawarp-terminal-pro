export type UpdateSource = "manual" | "startup" | "interval";

export function updateSourceLabel(source: UpdateSource): string {
  if (source === "startup") return "startup";
  if (source === "interval") return "interval";
  return "manual";
}
