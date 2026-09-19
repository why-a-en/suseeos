"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SettingRow } from "@/components/ui/setting-row";
import { Icon } from "@/components/icon";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { getInstallPrompt, onInstallPromptAvailable, clearInstallPrompt, type BeforeInstallPromptEvent } from "@/lib/install-prompt";

/**
 * "Install app" for Settings, in three states:
 *
 * - **Installed** (`display-mode: standalone`, or just accepted the prompt
 *   this session): a plain status row, not hidden — someone who already
 *   installed it should see that reflected here, not wonder whether the
 *   row disappearing means something went wrong.
 * - **Android/Chrome/Edge**: fires `beforeinstallprompt` once the manifest +
 *   HTTPS install criteria are met (manifest.ts). Captured from
 *   src/lib/install-prompt.ts rather than listened for here — Chrome
 *   typically fires it once, early, often on `/login` before anyone's
 *   logged in and several navigations before Settings ever mounts, and a
 *   listener attached only here would simply miss it. Tapping "Install"
 *   calls `.prompt()` directly — the one first-party way to trigger the OS
 *   install dialog, instead of sending someone hunting through the
 *   browser's own menu.
 * - **iOS Safari**: never fires that event at all — Apple restricts
 *   triggering "Add to Home Screen" to its own Share sheet, no
 *   page-triggered install exists there, full stop. The button still
 *   shows (tapping it can't silently do nothing), but it opens a sheet
 *   with the actual steps instead of attempting an install this platform
 *   will never allow.
 *
 * Nothing renders only when none of the above applies — a browser that's
 * neither iOS nor has fired the install event yet has nothing useful to
 * offer here.
 *
 * Renders its own "App" SectionHeader rather than letting Settings place
 * one above it, precisely *because* of that last case: this is the only
 * thing in that section, so a header owned by the page would be left
 * hanging over nothing on every desktop browser and every already-installed
 * non-iOS device. Header and row appear and disappear as one unit.
 */
export function InstallAppRow() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);

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
    // the same page load — but only flip to "installed" on acceptance, so
    // a dismiss leaves the door open without a dead button behind it (the
    // row falls back to matchMedia's answer, still false, on the next
    // render either way).
    if (outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
    clearInstallPrompt();
  }

  if (isStandalone || installed) {
    return (
      <>
        <SectionHeader>App</SectionHeader>
        <SettingRow label="Install app">
          <span className="flex items-center gap-1.5 font-ui text-small text-text-faint">
            <Icon name="check" size={14} />
            Installed
          </span>
        </SettingRow>
      </>
    );
  }

  if (!isIOS && !installEvent) return null;

  return (
    <>
      <SectionHeader>App</SectionHeader>
      <SettingRow label="Install app">
        <Button size="sm" icon="download" onClick={isIOS ? () => setShowIOSSheet(true) : install} className="shrink-0">
          Install
        </Button>
      </SettingRow>

      {isIOS ? (
        <Sheet open={showIOSSheet} onOpenChange={setShowIOSSheet}>
          <SheetContent>
            <SheetHeader title="Install SuSeeOS" />
            <SheetBody>
              <ol className="grid gap-4">
                <li className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-small-strong text-text-faint">1</span>
                  <p className="font-ui text-body text-text-body">
                    Tap the <Icon name="share" size={15} className="mx-0.5 inline-block align-[-3px]" /> Share icon in Safari&rsquo;s toolbar.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-small-strong text-text-faint">2</span>
                  <p className="font-ui text-body text-text-body">
                    Scroll down and tap <strong className="font-semibold text-text-strong">Add to Home Screen</strong>.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-small-strong text-text-faint">3</span>
                  <p className="font-ui text-body text-text-body">
                    Tap <strong className="font-semibold text-text-strong">Add</strong> to confirm.
                  </p>
                </li>
              </ol>
            </SheetBody>
            <SheetFooter>
              <Button full onClick={() => setShowIOSSheet(false)}>
                Got it
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}
