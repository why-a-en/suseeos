"use client";

import { useEffect } from "react";
import { useQueryState } from "nuqs";
import { toast } from "sonner";

/** Fires a toast once when `param` is present in the URL, then strips it.
 *  The client-side counterpart to a Server Action that redirects on
 *  success (saveOrderAction, deleteDraftAction, createProductAction) —
 *  those have no way to hand a success message to the client directly,
 *  since the redirect itself is what signals success (it throws, caught by
 *  Next before any return value reaches the caller). */
export function ToastFromQuery({ param, message, variant = "success" }: { param: string; message: string; variant?: "success" | "error" }) {
  const [value, setValue] = useQueryState(param);

  useEffect(() => {
    if (value === null) return;
    toast[variant](message);
    setValue(null);
  }, [value, message, variant, setValue]);

  return null;
}
