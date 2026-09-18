export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Module-level capture for `beforeinstallprompt`, separate from any one
 * component's lifecycle. Chrome fires this event once, early — typically
 * on the very first page of the session (often `/login`, before anyone's
 * even authenticated) — not on whichever page happens to be mounted when a
 * component gets around to adding its listener. `InstallAppRow` living in
 * Settings, several navigations later, missed it outright: a browser
 * event with no listener attached yet at fire time is just gone, nothing
 * replays it. `initInstallPromptCapture()` is called once from the root
 * layout instead (as early as the app's own JS runs at all, on every
 * page), and this module holds the result for whoever asks later.
 */
let capturedEvent: BeforeInstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<(e: BeforeInstallPromptEvent) => void>();

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
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
