export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Set by the blocking inline script in layout.tsx's <head> — see its
     *  own comment for why capture has to start there, before any JS
     *  bundle, rather than from a React effect. */
    __pwaInstall?: BeforeInstallPromptEvent | null;
  }
}

/**
 * Capture for `beforeinstallprompt`, independent of any one component's
 * lifecycle. Chrome fires this event once, early — often on the very first
 * page of the session (`/login`, before anyone's even authenticated), and
 * frequently before React has even hydrated on a cold load. Two capture
 * paths exist for that reason:
 *
 * 1. A plain inline `<script>` in layout.tsx's `<head>`, which runs during
 *    HTML parsing — before any JS bundle downloads, let alone hydrates —
 *    and stores the event on `window.__pwaInstall`. This is what actually
 *    wins the race on a cold load; without it, Chrome shows its own
 *    automatic mini-infobar instead (that's what appeared on /login), and
 *    by the time this module or any React component gets a chance to
 *    listen, the one-shot event is already spent.
 * 2. `initInstallPromptCapture()`, called from the root layout's
 *    `InstallPromptListener` — a normal React-side listener, for the
 *    (typical, on any *later* navigation) case where hydration has long
 *    since finished by the time Chrome's criteria resolve.
 *
 * `getInstallPrompt()` checks both; whichever path won the race, callers
 * don't need to know which.
 */
let capturedEvent: BeforeInstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<(e: BeforeInstallPromptEvent) => void>();

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window !== "undefined" && window.__pwaInstall) return window.__pwaInstall;
  return capturedEvent;
}

/** Notifies callers already mounted if the event arrives after they asked —
 *  covers the (rarer) case where Chrome's install criteria resolve while
 *  the interested component is already on screen. Returns an unsubscribe. */
export function onInstallPromptAvailable(cb: (e: BeforeInstallPromptEvent) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Single-use, same as the event itself — call after `.prompt()` resolves. */
export function clearInstallPrompt(): void {
  capturedEvent = null;
  if (typeof window !== "undefined") window.__pwaInstall = null;
}

export function initInstallPromptCapture(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    capturedEvent = e as BeforeInstallPromptEvent;
    listeners.forEach((cb) => cb(capturedEvent!));
  });
}
