"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getInstallPrompt, onInstallPromptAvailable, clearInstallPrompt, type BeforeInstallPromptEvent } from "@/lib/install-prompt";

/**
 * One-tap "Install app" for Settings. Android/Chrome/Edge fire
 * `beforeinstallprompt` once the manifest + HTTPS install criteria are met
 * (manifest.ts) — capturing it and calling `.prompt()` from our own button
 * is the one first-party way to trigger the OS install dialog directly,
 * rather than sending someone hunting through the browser's own menu for
 * "Add to Home Screen" or "Install app".
 *
 * Reads the event from src/lib/install-prompt.ts rather than listening
 * itself: Chrome typically fires this once, early — often on the very
 * first page of the session (`/login`, before anyone's logged in), several
 * navigations before someone ever reaches Settings — and a listener
 * attached only when this component mounts simply misses an event that
 * already fired with nothing else listening. The shared module (captured
 * from the root layout, on every page) is what actually catches it.
 *
 * iOS Safari never fires this event — Apple restricts triggering "Add to
 * Home Screen" to its own Share sheet, no page-triggered install exists
 * there — so this shows a one-line instruction instead of a button that
 * could never do anything. Nothing renders once the app is already running
 * standalone (installed), or on a browser offering neither path (nothing
 * useful to show there).
 */
export function InstallAppRow() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // One-time read of real client-only truth after mount, same pattern (and
    // same reason for the disable) as theme-toggle.tsx's own effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window));

    // Already captured before this page mounted — the common case, since
    // the root layout starts listening on the first page of the session.
    const existing = getInstallPrompt();
    if (existing) setInstallEvent(existing);

    // Still subscribe for the rarer case where Chrome's criteria resolve
    // while Settings itself is already open.
    return onInstallPromptAvailable(setInstallEvent);
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    // The event is single-use either way — Chrome never fires it again for
    // the same page load — but only flip to "installed" (hiding the row for
    // good, past a refresh matchMedia already catches it) on acceptance, so
    // a dismiss leaves the door open without a dead button behind it.
    if (outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
    clearInstallPrompt();
  }

  if (isStandalone || installed) return null;
  if (!isIOS && !installEvent) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-hairline px-5 py-3">
      <div className="min-w-0">
        <span className="block">Install app</span>
        {isIOS ? (
          <span className="mt-0.5 block font-ui text-small text-text-faint">
            Tap the Share icon, then &ldquo;Add to Home Screen&rdquo;.
          </span>
        ) : null}
      </div>
      {!isIOS ? (
        <Button size="sm" icon="download" onClick={install} className="shrink-0">
          Install
        </Button>
      ) : null}
    </div>
  );
}
