import type { MetadataRoute } from "next";

/**
 * Web App Manifest (Next.js file convention — served at /manifest.webmanifest).
 * Makes the app installable to a home screen with its own icon and no
 * browser chrome (`display: "standalone"`) — the one piece needed for a
 * one-tap "Add to Home Screen"/install prompt on Android/Chrome; iOS Safari
 * ignores this file for its own icon entirely and reads layout.tsx's
 * explicit `icons.apple` metadata instead (which is also where the
 * light/dark icon variants live — this manifest's `icons` array has no
 * equivalent, single fixed icon only), which is why both exist.
 *
 * `theme_color`/`background_color` are the *dark* surface-page token
 * (oklch(0.178 0.004 75) → #12110f, computed via the standard OKLCH→sRGB
 * matrices since the token itself has no precomputed hex) — dark is this
 * system's default theme, and this is what the OS paints behind the splash
 * screen before the app's own CSS has loaded, so it has to match exactly or
 * the transition into the app flashes.
 *
 * The name carries the environment: `VERCEL_ENV` is "production" only on
 * main's deploys, "preview" for every dev/PR build, and unset for local
 * `next dev` — both of the latter get " (Dev)" appended, so installing the
 * staging build alongside the real app doesn't leave two identical icons
 * on a tester's home screen with no way to tell which is which.
 *
 * No offline/service-worker support here on purpose — this app hits
 * Postgres live for orders/inventory, and "works offline" would mean
 * showing stale or wrong stock, which is worse than a clear "you're
 * offline" state. Installable-app tier only.
 */
const isProduction = process.env.VERCEL_ENV === "production";
const name = isProduction ? "SuSeeOS" : "SuSeeOS (Dev)";
const shortName = isProduction ? "SuSeeOS" : "SuSeeOS Dev";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name,
    short_name: shortName,
    description: "Product catalog and daily order coordination for Support Agents and Suppliers.",
    start_url: "/",
    display: "standalone",
    background_color: "#12110f",
    theme_color: "#12110f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
