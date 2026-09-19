import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

// Wraps the build to upload source maps (so a captured stack trace points
// at real source, not minified bundle output) and, in prod, route Sentry's
// own client requests through this app's own domain instead of directly to
// sentry.io — an ad-blocker blocking the latter would otherwise silently
// blind exactly the client-side capture this exists for.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Present only in CI/Vercel once actually configured — its absence
  // shouldn't fail a build, just skip the source-map upload step.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  tunnelRoute: "/monitoring",
  // Deletes the source maps from the client bundle after upload — they'd
  // otherwise ship to every visitor's browser, unminified app source
  // included.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  // disableLogger is deprecated (and its replacement,
  // webpack.treeshake.removeDebugLogging, isn't supported under Turbopack,
  // which this project builds with) — nothing to opt into here yet.
});
