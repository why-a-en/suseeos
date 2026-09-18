import { Screen, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";

/**
 * Shared body for every dashboard route's `loading.tsx` (a Next.js file
 * convention — the App Router wraps the route in Suspense and shows this
 * while the real page renders on the server).
 *
 * Every route under `(dashboard)` is dynamically rendered — per-request
 * session/org data — and Next's own navigation docs name a missing
 * `loading.tsx` as the single biggest cause of a dynamic route *feeling*
 * slow to navigate to: with none, the client has to wait for the full
 * server response before showing anything, so a tab-bar tap looked and felt
 * dead for however long that took. This gets the real TopBar (title, brand
 * mark or back arrow — everything that doesn't depend on data) on screen
 * immediately, before the destination page's own data has even started
 * loading server-side.
 *
 * The body is one `.ds-working` surface — this design system's own "this
 * is busy" treatment (see base.css: "One pass of light across the
 * surface... not a spinner, and not a grey skeleton that reads as a bug")
 * — rather than a set of row-shaped skeleton bars guessing at content that
 * hasn't loaded yet.
 */
export function ScreenLoading({
  title,
  brand,
  backHref,
}: {
  title: string;
  brand?: boolean;
  backHref?: string;
}) {
  return (
    <Screen>
      <TopBar title={title} brand={brand} backHref={backHref} />
      <ScrollBody>
        <div className="ds-working m-5 h-40 rounded-md bg-surface-card" />
      </ScrollBody>
    </Screen>
  );
}
