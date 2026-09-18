"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { Icon } from "@/components/icon";

/** Sonner replaces the old per-view `useState` + manual `setTimeout`
 *  auto-dismiss pair with a real stacking/swipe-to-dismiss/aria-live toast.
 *  Mounted once in the dashboard shell (see (dashboard)/layout.tsx).
 *
 *  `toast.error` is a real, established pattern here (see e.g.
 *  staff-view.tsx, store-detail-view.tsx) for failures light enough not to
 *  need ErrorDialog's blocking acknowledgment — so success and error get a
 *  bold, distinct fill (green/red, from the toast-only hue exception in
 *  colors.css) rather than sharing one neutral card. Every other toast type
 *  falls back to `default`'s plain raised-card look. */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      duration={3200}
      // Clears the bottom tab bar (--bar-bottom-h) plus the raised Home
      // island that floats above it — a toast pinned to the viewport edge
      // lands underneath both and is unreadable on the screens that raise
      // most of them.
      offset={{ bottom: "76px" }}
      mobileOffset={{ bottom: "76px" }}
      icons={{
        success: <Icon name="check" size={16} color="var(--color-toast-success-ink)" />,
        error: <Icon name="triangle-alert" size={16} color="var(--color-toast-danger-ink)" />,
      }}
      style={{ "--width": "min(90vw, calc(var(--content-max) - 2 * var(--gutter)))" } as React.CSSProperties}
      toastOptions={{
        unstyled: true,
        classNames: {
          // Shared layout only — no colour here, so it can never fight the
          // per-type background/text/border classes below on specificity.
          toast: "flex items-center gap-2.5 rounded-sm border px-3.5 py-3 font-ui text-small shadow-dialog",
          default: "border-line-strong bg-surface-raised text-text-body",
          success: "border-transparent bg-toast-success-bg text-toast-success-ink",
          error: "border-transparent bg-toast-danger-bg text-toast-danger-ink",
          title: "flex-1",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
