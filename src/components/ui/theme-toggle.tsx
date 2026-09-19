"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Switch } from "@/components/ui/switch";

type Theme = "dark" | "light";

/** Flips [data-theme] on <html> and persists the choice to localStorage, read
 *  back by the blocking inline script in layout.tsx's <head> (so a returning
 *  visitor who chose light doesn't flash back to the dark default on load).
 *  Dark is the product default; light is the opt-in.
 *
 *  Checked means dark, because dark is the default state — a switch that's
 *  off out of the box would suggest the app starts light. The moon/sun in
 *  the thumb is what makes this legible in the TopBar with no label beside
 *  it; the aria-label carries the same thing for assistive tech, since the
 *  icon is decorative. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // One-time read of the real client truth after mount: the server always
    // renders the "dark" default (it has no access to localStorage), and the
    // blocking script in layout.tsx's <head> already corrected the *page*
    // theme before paint if needed — this just brings the toggle's own label
    // in sync with that, without risking a hydration mismatch by reading
    // `document` during the initial render itself.
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function apply(t: Theme) {
    if (t === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    // Keeps the PWA status-bar/splash colour (viewport.themeColor,
    // layout.tsx) matching whichever theme is actually on screen — that tag
    // tracks this app's own override, not the OS's prefers-color-scheme, so
    // nothing updates it automatically. Values are the dark/light
    // --surface-page hex (see layout.tsx's comment on where they come from).
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", t === "light" ? "#f2f1ee" : "#12110f");
    try {
      localStorage.setItem("theme", t);
    } catch {
      // Private browsing / storage blocked — theme still applies for this load.
    }
    setTheme(t);
  }

  return (
    <Switch
      checked={theme === "dark"}
      onCheckedChange={(checked) => apply(checked ? "dark" : "light")}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      thumbIcon={<Icon name={theme === "dark" ? "moon-star" : "sun"} size={14} />}
      className={className}
    />
  );
}
