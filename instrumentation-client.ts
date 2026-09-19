import * as Sentry from "@sentry/nextjs";

// This is where a bug like the R2-upload-checksum one actually gets seen:
// image-upload-field.tsx's fetch runs entirely in the browser, straight to
// R2, and never touches the Next.js server at all — no server log, of any
// kind, could ever have shown it. This file (Next's client instrumentation
// convention, not a Sentry-specific one — see node_modules/next/dist/docs/
// .../instrumentation-client.md) is what gives client-side failures
// anywhere to go.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  // Session Replay: a recording of what the screen actually looked like
  // when an error fired — worth it on a phone-first app where "what did
  // you see" is otherwise a game of telephone. Full replay only on the
  // session that actually errored; a tiny, non-error sample rate otherwise
  // just to catch UI issues that don't throw.
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});

// See sentry.server.config.ts — same PII reasoning, same default (omitted
// here entirely: sendDefaultPii has no client-side effect on request data,
// only on Replay's default masking, which stays on by default for the same
// reason).

export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  Sentry.addBreadcrumb({
    category: "navigation",
    message: `${navigationType} → ${url}`,
    level: "info",
  });
}
