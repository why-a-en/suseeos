// The app's own public base URL, for links we put in outbound email.
//
// Same resolution order as better-auth's `resolveBaseURL` (src/lib/auth/config.ts),
// duplicated here rather than imported because that file is off-limits to
// feature code — and this needs no `next/*` either, so email helpers stay
// framework-free. `APP_BASE_URL` wins; on Vercel, Production gets the
// stable custom domain and every other environment gets a URL that
// actually points back at itself; localhost last.
export function appBaseURL(): string {
  const explicit = process.env.APP_BASE_URL ?? process.env.BETTER_AUTH_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  // VERCEL_PROJECT_PRODUCTION_URL is *always* set, on every environment —
  // it's "the production domain," not "this deployment's domain" — so
  // using it unconditionally sends a Preview-built invitation link (or
  // better-auth's own baseURL) to production instead of back to the
  // Preview deployment that sent it. Gate it on actually being Production.
  // VERCEL_BRANCH_URL (stable per git branch) beats VERCEL_URL (unique per
  // deployment, reshuffles on every push) for everything else.
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  const host = process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}
