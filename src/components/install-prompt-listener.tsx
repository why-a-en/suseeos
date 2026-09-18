"use client";

import { useEffect } from "react";
import { initInstallPromptCapture } from "@/lib/install-prompt";

/** Mounted once in the root layout — not (dashboard)'s — so capture starts
 *  on literally the first page of the session, /login included: a
 *  logged-out visitor can be the one Chrome decides is ready to install on. */
export function InstallPromptListener() {
  useEffect(() => {
    initInstallPromptCapture();
  }, []);
  return null;
}
