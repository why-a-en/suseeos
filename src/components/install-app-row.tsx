"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * One-tap "Install app" for Settings. Android/Chrome/Edge fire
 * `beforeinstallprompt` once the manifest + HTTPS install criteria are met
 * (manifest.ts) — capturing it and calling `.prompt()` from our own button
 * is the one first-party way to trigger the OS install dialog directly,
 * rather than sending someone hunting through the browser's own menu for
 * "Add to Home Screen" or "Install app". `preventDefault()` on the event is
 * what suppresses the browser's own automatic mini-infobar so this button
 * is the only prompt shown.
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

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
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
        <Button size="sm" icon="download" haptic="light" onClick={install} className="shrink-0">
          Install
        </Button>
      ) : null}
    </div>
  );
}
