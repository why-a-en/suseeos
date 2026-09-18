/**
 * A short `navigator.vibrate` pulse for the tactile `haptic` prop on
 * Button/Row/Toggle (see button.tsx). Feature-detected rather than
 * try/caught on the call itself where possible — `"vibrate" in navigator`
 * is `false` on desktop and on iOS Safari (which has no Vibration API at
 * all), so both no-op silently with zero cost. The try/catch below is for
 * the narrower case some browsers still throw in (outside a user gesture,
 * inside a cross-origin iframe) even though the API is present.
 *
 * Deliberately a plain function, not a hook: it's fire-and-forget with no
 * state to track, called straight out of a `pointerdown` handler.
 */
export type HapticIntensity = "light" | "strong";

const PATTERN_MS: Record<HapticIntensity, number> = {
  light: 12,
  strong: 35,
};

export function fireHaptic(intensity: HapticIntensity): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERN_MS[intensity]);
  } catch {
    // Unsupported in this context (cross-origin iframe, no user-gesture
    // history, etc.) — a missed buzz isn't worth surfacing.
  }
}
