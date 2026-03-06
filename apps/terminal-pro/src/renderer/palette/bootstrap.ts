/**
 * Palette bootstrap - initializes the command palette UI.
 * Handles Cmd/Ctrl+K to open palette when closed.
 * When palette is open, controller handles all keyboard events.
 */

import { buildDefaultCommands } from "./commands.js";
import { createPaletteController } from "./controller.js";

function isModK(ev: KeyboardEvent): boolean {
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const mod = isMac ? ev.metaKey : ev.ctrlKey;
  return mod && ev.key.toLowerCase() === "k" && !ev.altKey && !ev.shiftKey;
}

function isEditableTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  // Allow palette shortcut from the primary command box.
  if (node.id === "intent" || node.closest?.("#intent")) return false;
  const tag = node.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || node.isContentEditable;
}

export function bootstrapPalette(): void {
  // One-time guard to prevent double-registration
  // Also verify DOM exists (handles HMR/dev reload edge cases)
  const backdrop = document.getElementById("rw-palette-backdrop");
  const host = document.getElementById("rw-palette");
  if (!backdrop || !host) return;

  if ((window as any).__rwPaletteBootstrapped) return;
  (window as any).__rwPaletteBootstrapped = true;

  const controller = createPaletteController({ backdrop, host });

  // Global keyboard shortcut for opening palette (only when closed)
  // When palette is open, controller's event handlers take over
  const onGlobalKeydown = async (e: KeyboardEvent) => {
    // Skip if already handled, IME composing, or palette is open
    if (e.defaultPrevented || e.isComposing || controller.isOpen()) return;

    // Cmd/Ctrl+K to open
    if (isModK(e)) {
      // Don't steal from editable fields
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      const commands = await buildDefaultCommands();
      controller.setCommands(commands);
      controller.open();
    }
  };

  window.addEventListener("keydown", onGlobalKeydown, { capture: true });
}
