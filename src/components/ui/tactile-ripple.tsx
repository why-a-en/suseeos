import type { Ripple } from "@/lib/use-ripple";

/**
 * Renders the spans `useRipple()` tracks — expanding/fading circles at the
 * pointer's own coordinates (`ds-ripple`, tokens/motion.css), `currentColor`
 * so it costs no hue against the monochrome system. Purely presentational;
 * the host element supplies `relative overflow-hidden` and calls
 * `onDone(ripple.id)` from each span's own `onAnimationEnd` so a ripple is
 * removed exactly once, with no timers to manage.
 */
export function TactileRipple({ ripples, onDone }: { ripples: Ripple[]; onDone: (id: number) => void }) {
  if (ripples.length === 0) return null;

  return (
    <>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          aria-hidden="true"
          onAnimationEnd={() => onDone(ripple.id)}
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current animate-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </>
  );
}
