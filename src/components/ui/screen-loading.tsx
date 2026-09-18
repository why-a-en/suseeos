import { Screen, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { cn } from "@/lib/utils";

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
 * A first version put `.ds-working` (this system's own "busy" sweep,
 * base.css) on one large plain block — technically on-brand, but at that
 * size and against `bg-surface-card` (pure white in light theme) the sweep
 * itself all but disappears, so it just read as a blank box with no shape
 * and nothing visibly happening. This version keeps the same sweep
 * mechanic but shapes it like the row list every one of these routes
 * actually renders (`Row`'s own `px-5 py-3` rhythm, hairline dividers) —
 * a leading block plus two text-line bars per row, `bg-surface-sunken` for
 * real contrast against the page — so it reads immediately as "a list is
 * about to appear here" rather than as a broken placeholder.
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
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingRow key={i} />
        ))}
      </ScrollBody>
    </Screen>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-3 border-b border-line-hairline px-5 py-3">
      <Bar className="size-10 shrink-0 rounded-sm" />
      <div className="grid min-w-0 flex-1 gap-2">
        <Bar className="h-3.5 w-2/3 rounded-sm" />
        <Bar className="h-3 w-1/3 rounded-sm" />
      </div>
    </div>
  );
}

function Bar({ className }: { className?: string }) {
  return <div className={cn("ds-working bg-surface-sunken", className)} />;
}
