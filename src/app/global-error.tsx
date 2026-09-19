"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Only fires for an error a route's own error.tsx doesn't catch — most
// screens don't have one, so in practice this is the actual last-resort
// backstop. Replaces the root layout entirely while it's showing (App
// Router requirement — this is why it needs its own <html>/<body> rather
// than composing with RootLayout), so it stays deliberately minimal:
// no design-system components, nothing that could itself throw.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, display: "grid", placeItems: "center", minHeight: "100dvh" }}>
        <p style={{ fontFamily: "system-ui, sans-serif", color: "#888" }}>
          Something went wrong. Reload to try again.
        </p>
      </body>
    </html>
  );
}
