import type { ReactNode } from "react";
import { Screen, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { cn } from "@/lib/utils";

/**
 * Shell for every dashboard route's `loading.tsx` (a Next.js file
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
 * immediately.
 *
 * `children` is deliberately a slot, not a fixed body: an early version put
 * the same generic row list here for every route, and it read as wrong on
 * anything that isn't a plain list (Home's stat tiles + shortcut grid,
 * Settings' label/value rows, Parcels' segmented toolbar) — a skeleton that
 * doesn't resemble what's about to load reads as a bug, not a loading
 * state. Each route composes its own body below from the shapes that
 * actually match it.
 */
export function ScreenLoading({
  title,
  brand,
  backHref,
  children,
}: {
  title: string;
  brand?: boolean;
  backHref?: string;
  children: ReactNode;
}) {
  return (
    <Screen>
      <TopBar title={title} brand={brand} backHref={backHref} />
      <ScrollBody>{children}</ScrollBody>
    </Screen>
  );
}

/** The one primitive every shape below is built from: a `.ds-working` sweep
 *  (this system's own "busy" treatment, base.css) on `bg-surface-sunken` —
 *  the same background pairing image-upload-field.tsx already uses
 *  successfully for its own busy state. */
function Bar({ className }: { className?: string }) {
  return <div className={cn("ds-working bg-surface-sunken", className)} />;
}

/** A row matching `Row`'s own rhythm (`px-5 py-3`, hairline divider) — for
 *  every plain list screen (Orders, Products, Customers, Parcels,
 *  Unsourced). `avatar` matches the real row's own leading shape: "square"
 *  for a product/parcel thumbnail (Thumb, ProductRow/OrderItemRow), "circle"
 *  for a person (CustomerRow's initials avatar), "none" for the Orders log
 *  itself, which has no leading image at all. */
export function LoadingRows({ count = 6, avatar = "square" }: { count?: number; avatar?: "square" | "circle" | "none" }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-line-hairline px-5 py-3">
          {avatar !== "none" && <Bar className={cn("size-10 shrink-0", avatar === "circle" ? "rounded-full" : "rounded-sm")} />}
          <div className="grid min-w-0 flex-1 gap-2">
            <Bar className="h-3.5 w-2/3 rounded-sm" />
            <Bar className="h-3 w-1/3 rounded-sm" />
          </div>
        </div>
      ))}
    </>
  );
}

/** Matches `Toolbar` + `SearchField` (Orders, Purchase-queue): one pill the
 *  height of the real search bar. */
export function LoadingSearchToolbar() {
  return (
    <div className="px-5 pt-3 pb-3">
      <Bar className="h-11 w-full rounded-sm" />
    </div>
  );
}

/** Matches `Toolbar` + `SegmentedControl` (Parcels): a row of equal pill
 *  segments rather than one bar, since a segmented control visibly has
 *  several tap targets, not one field. */
export function LoadingSegmentedToolbar({ segments = 3 }: { segments?: number }) {
  return (
    <div className="flex gap-2 px-5 pt-3 pb-3">
      {Array.from({ length: segments }).map((_, i) => (
        <Bar key={i} className="h-9 flex-1 rounded-sm" />
      ))}
    </div>
  );
}

/** Matches `StatTile`'s own grid placement (Home, Purchase-queue) — same
 *  `gap-3`/`gap-2` row of equal tiles, tall enough to read as a metric card
 *  rather than a text line. */
export function LoadingStatTiles({ count = 2, gap = "gap-3" }: { count?: number; gap?: "gap-2" | "gap-3" }) {
  return (
    <div className={cn("flex px-5 pt-3", gap)}>
      {Array.from({ length: count }).map((_, i) => (
        <Bar key={i} className="h-20 flex-1 rounded-md" />
      ))}
    </div>
  );
}

/** Matches Home's Shortcuts grid: 2-column cards, each a circular icon
 *  placeholder over a label line, same as the real `<Link>` cards. */
export function LoadingShortcutsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-5 pt-3 pb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center justify-center gap-2.5 rounded-md border border-line-hairline px-3 py-5">
          <Bar className="size-10 rounded-full" />
          <Bar className="h-3 w-16 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/** A section label placeholder, matching `SectionHeader`'s own leading
 *  micro-label position (Settings). */
export function LoadingSectionHeader() {
  return (
    <div className="px-5 pt-4 pb-2">
      <Bar className="h-2.5 w-24 rounded-sm" />
    </div>
  );
}

/** A label/value row with no leading avatar — Settings' Theme/Session rows,
 *  which read out a setting rather than list a record. */
export function LoadingLabelRow() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-hairline px-5 py-3">
      <Bar className="h-3.5 w-20 rounded-sm" />
      <Bar className="h-3.5 w-28 rounded-sm" />
    </div>
  );
}

/** A bordered card, matching `PurchaseGroupCard`'s own
 *  `rounded-md border bg-surface-card shadow-raised` shell — Purchase-queue
 *  renders cards, not flat hairline rows, so a row-shaped skeleton there
 *  would read as the wrong screen. */
export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 px-5 pb-12">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-md border border-line-hairline bg-surface-card p-3.5 shadow-raised">
          <Bar className="size-12 shrink-0 rounded-sm" />
          <div className="grid min-w-0 flex-1 gap-2">
            <Bar className="h-4 w-2/3 rounded-sm" />
            <Bar className="h-3 w-1/3 rounded-sm" />
          </div>
          <Bar className="h-6 w-12 shrink-0 self-center rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/** A wide single line — Home's greeting, the one piece of display text on
 *  that screen with no row/card shape of its own. */
export function LoadingHeadline() {
  return (
    <div className="px-5 pt-4 pb-1">
      <Bar className="h-7 w-3/4 rounded-sm" />
    </div>
  );
}
