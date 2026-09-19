import * as Sentry from "@sentry/nextjs";

// Node runtime only (instrumentation.ts loads this one under
// NEXT_RUNTIME==="nodejs"): Server Components, Route Handlers, Server
// Actions. A missing SENTRY_DSN doesn't throw — Sentry's SDK no-ops the
// transport when dsn is undefined, so this is safe to ship before the DSN
// is actually set (docs/TECH_STACK.md's "server boots without X" pattern,
// same as RESEND_API_KEY/R2 below).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // 1.0 while this is a small, low-traffic app — cheap in real dollars at
  // this volume, and full traces are worth more than a sampled few while
  // still figuring out what's actually worth tracing. Revisit once traffic
  // (or the Sentry bill) makes that untrue.
  tracesSampleRate: 1.0,
  // Left at the SDK's own default (false) deliberately: this app's whole
  // multi-tenant design leans on not leaking one Store's data anywhere it
  // doesn't belong (RLS, docs/DATA_MODEL.md §5) — a customer's name, phone
  // or address ending up in a captured request body/IP on a third-party
  // service is exactly the kind of leak that model exists to prevent. Turn
  // this on only deliberately, with a scrubbing rule already in place.
});
