import * as Sentry from "@sentry/nextjs";

// Edge runtime only (instrumentation.ts loads this one under
// NEXT_RUNTIME==="edge") — this app's proxy.ts middleware. Kept separate
// from sentry.server.config.ts because the edge runtime doesn't support
// every Node-only integration the server config could otherwise pull in.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  // See sentry.server.config.ts's comment — same reasoning, same default.
});
