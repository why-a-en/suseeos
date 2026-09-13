"use client";

import { useEffect, useState } from "react";

export type EmailCheckStatus = "idle" | "checking" | "valid" | "invalid";

/**
 * Debounced live validation for an email field that's about to trigger a
 * real invitation — the same assertDeliverableEmail() the submit action
 * already runs (syntax, disposable-domain, DNS, and now the Resend
 * suppression check — src/lib/email/address.ts), just run early enough to
 * catch a bad address before anyone taps Send/Create, not after.
 *
 * `action` is the caller's own auth-gated Server Action wrapping
 * assertDeliverableEmail — this hook has no opinion on who's allowed to
 * check what, only on when. Debounced 500ms past the last keystroke, one
 * request per pause.
 *
 * The "idle"/"checking" transitions are set from the returned `setValue`
 * (called from the input's own onChange, i.e. an event handler) rather
 * than synchronously inside the effect below — a stricter eslint rule
 * (react-hooks/set-state-in-effect) flags a same-tick setState at the top
 * of an effect body, and it's right to: a state change that's a direct
 * response to a keystroke belongs in the handler that keystroke fired, not
 * smuggled into an effect. The effect itself only ever sets state inside
 * its async timer callback, which is a genuine response to something
 * external (the network) resolving later — exactly what effects are for.
 * Its own cleanup (the `cancelled` flag) is what stops a slow, now-stale
 * check from overwriting a newer one's result if someone keeps typing
 * before the first one answers.
 */
export function useEmailCheck(action: (email: string) => Promise<{ error?: string }>) {
  const [value, setValueRaw] = useState("");
  const [status, setStatus] = useState<EmailCheckStatus>("idle");
  const [error, setError] = useState<string | undefined>();

  function setValue(next: string) {
    setValueRaw(next);
    setStatus(next.trim() ? "checking" : "idle");
  }

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await action(trimmed);
      if (cancelled) return;
      if (result.error) {
        setStatus("invalid");
        setError(result.error);
      } else {
        setStatus("valid");
        setError(undefined);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, action]);

  return { value, setValue, status, error };
}
