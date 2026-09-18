"use client";

import { useEffect } from "react";

/**
 * Corrects the `theme-color` meta tag (viewport export, layout.tsx) to
 * match a returning visitor's saved light-theme choice, on mount rather
 * than from the blocking inline theme script.
 *
 * That script runs during HTML parsing, before Next's own metadata tags
 * are necessarily in the document yet — reasonable for flipping
 * `data-theme` on `<html>` (an attribute on an element that's already
 * there by definition), but `document.querySelector('meta[name="theme-
 * color"]')` at that point can miss the tag entirely and silently no-op,
 * which is exactly what left an installed Android PWA's status bar stuck
 * dark after switching to light: the meta tag genuinely never got updated
 * on load, only on the next in-session toggle (theme-toggle.tsx's own
 * apply(), which runs long after the DOM is complete and doesn't have this
 * problem).
 *
 * A `useEffect` in a mounted component runs after hydration — the DOM,
 * Next's metadata tags included, is guaranteed complete by then. Reads
 * `data-theme` off `<html>` rather than localStorage directly, matching
 * theme-toggle.tsx's own "ask the DOM for the truth after mount" pattern,
 * so this can never disagree with what the page actually rendered.
 */
export function ThemeColorSync() {
  useEffect(() => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isLight ? "#f2f1ee" : "#12110f");
  }, []);
  return null;
}
