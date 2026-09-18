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
 *
 * Two icon purposes, not one: without an explicit `"maskable"` entry,
 * Android doesn't trust that an arbitrary square PNG will survive being
 * cropped to its own mask shape (circle, squircle, teardrop — varies by
 * launcher) — so it defensively shrinks the *whole* icon and pads it onto a
 * plain white square instead, which is the mismatched white box some
 * launchers were showing. The `"any"` pair is the original icon (rounded
 * corners baked in, content close to the edges — for contexts that render
 * it unmasked and don't apply their own corner treatment); the `"maskable"`
 * pair is a dedicated full-bleed version — no baked-in corners, the mark
 * scaled down to sit inside the
 * ~80%-diameter "safe zone" every mask shape is guaranteed not to clip.
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
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
