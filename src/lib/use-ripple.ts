"use client";

import { useCallback, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface Ripple {
  id: number;
  x: number;
  y: number;
}

let nextId = 0;

/**
 * State + positioning for the opt-in tactile ripple (Button/Row `ripple`
 * prop — rendered by tactile-ripple.tsx). Kept separate from the
 * press-scale/haptic path: scale stays pure CSS `:active` (see button.tsx's
 * own note on why), and haptic is a fire-and-forget call — this hook's only
 * job is the one piece that genuinely needs JS, positioning a ripple at the
 * actual pointer coordinates and cleaning it up after it plays.
 *
 * Skips spawning under `prefers-reduced-motion: reduce`, checked live on
 * each pointerdown rather than cached — matches "disable scale/ripple
 * animation, keep haptic" without needing a mount-time listener for
 * something this infrequent.
 */
export function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ripple: Ripple = { id: nextId++, x: e.clientX - rect.left, y: e.clientY - rect.top };
    setRipples((prev) => [...prev, ripple]);
  }, []);

  const clearRipple = useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { ripples, onPointerDown, clearRipple };
}
