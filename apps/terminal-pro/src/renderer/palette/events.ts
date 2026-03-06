/**
 * Palette event handling - keyboard and mouse events.
 * Hardened: IME-safe, editable-aware, no double-fire, premium Esc behavior.
 */

import type { PaletteState } from "./state.js";
import type { RenderContext } from "./render.js";

type BackdropClickHandler = (ev: MouseEvent) => void;
type KeydownHandler = (ev: KeyboardEvent) => void;

export function wireInput(input: HTMLInputElement, onChange: (q: string) => void): () => void {
  const onInput = () => onChange(input.value);
  input.addEventListener("input", onInput);
  return () => input.removeEventListener("input", onInput);
}

function isEditableTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (node.isContentEditable) return true;
  return false;
}

function isPaletteInput(ctx: RenderContext, el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  return node === ctx.input;
}

function isModK(ev: KeyboardEvent): boolean {
  const k = ev.key.toLowerCase();
  return k === "k" && (ev.metaKey || ev.ctrlKey) && !ev.altKey && !ev.shiftKey;
}

function shouldIgnoreKey(ev: KeyboardEvent): boolean {
  if (ev.defaultPrevented) return true;
  if (ev.isComposing) return true;
  return false;
}

function wrapIndex(idx: number, len: number): number {
  if (len <= 0) return 0;
  if (idx < 0) return len - 1;
  if (idx >= len) return 0;
  return idx;
}

export function handleNavigationKey(ev: KeyboardEvent, state: PaletteState): boolean {
  const len = state.filtered.length;
  if (len <= 0) return false;

  if (ev.key === "ArrowDown") {
    state.activeIndex = wrapIndex(state.activeIndex + 1, len);
    return true;
  }
  if (ev.key === "ArrowUp") {
    state.activeIndex = wrapIndex(state.activeIndex - 1, len);
    return true;
  }
  if (ev.key === "Home") {
    state.activeIndex = 0;
    return true;
  }
  if (ev.key === "End") {
    state.activeIndex = len - 1;
    return true;
  }
  return false;
}

export function handleActionKey(
  ev: KeyboardEvent,
  state: PaletteState,
  deps: { runAt: (idx: number) => void; close: () => void; clearQuery: () => void; queryValue: () => string },
): boolean {
  if (ev.key === "Enter") {
    // Prevent double fire on key repeat
    if (ev.repeat) return true;
    deps.runAt(state.activeIndex);
    return true;
  }

  if (ev.key === "Escape") {
    const query = deps.queryValue().trim();
    // In command mode (`>` prefix), Esc closes the palette directly.
    if (query.startsWith(">")) {
      deps.close();
      return true;
    }
    // Premium UX: if query exists, clear first; else close.
    if (query.length > 0) {
      deps.clearQuery();
      return true;
    }
    deps.close();
    return true;
  }

  return false;
}

export type EventHandlers = {
  onKeydown: KeydownHandler;
  onBackdropClick: BackdropClickHandler;
};

export function createEventHandlers(
  state: PaletteState,
  ctx: RenderContext,
  deps: {
    backdrop: HTMLElement;
    close: () => void;
    runCommandAt: (idx: number) => void;
    onActiveIndexChanged?: (idx: number) => void;
    onFilterChanged?: (q: string) => void;
  },
): EventHandlers {
  const onBackdropClick: BackdropClickHandler = (ev) => {
    if (ev.target === deps.backdrop) deps.close();
  };

  const onKeydown: KeydownHandler = (ev) => {
    if (shouldIgnoreKey(ev)) return;

    // Cmd/Ctrl+K toggles palette globally, but do not steal from normal typing,
    // unless focus is already in palette input.
    if (isModK(ev)) {
      // If user is typing in another field, ignore.
      if (isEditableTarget(ev.target) && !isPaletteInput(ctx, ev.target)) return;
      ev.preventDefault();
      ev.stopPropagation();
      deps.close();
      return;
    }

    // If focus is in an editable field (including palette input), we still allow nav/actions,
    // but we do NOT allow random global steals.
    const navHandled = handleNavigationKey(ev, state);
    if (navHandled) {
      ev.preventDefault();
      ev.stopPropagation();
      deps.onActiveIndexChanged?.(state.activeIndex);
      return;
    }

    const actionHandled = handleActionKey(ev, state, {
      runAt: deps.runCommandAt,
      close: deps.close,
      clearQuery: () => {
        ctx.input.value = "";
        deps.onFilterChanged?.("");
      },
      queryValue: () => ctx.input.value,
    });

    if (actionHandled) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }

    if (ev.key === "Tab") {
      // Keep focus inside palette dialog.
      ev.preventDefault();
      ev.stopPropagation();
      ctx.input.focus();
    }
  };

  return { onBackdropClick, onKeydown };
}
