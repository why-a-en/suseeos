import * as Sentry from "@sentry/nextjs";

// Runs once per server instance, before it takes any requests. Split by
// runtime because sentry.server.config.ts (Node — Server Components, Route
// Handlers, Server Actions) and sentry.edge.config.ts (proxy.ts middleware)
// don't support the same integrations.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Next's own server-error hook (App Router: Server Components, Route
// Handlers, Server Actions) — this is what actually gets a server-side
// throw into Sentry; Sentry.init above only sets up *where* it goes.
export const onRequestError = Sentry.captureRequestError;
