"use client";

import type { MouseEventHandler, ReactNode } from "react";
import Link from "next/link";

import { Item } from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { fireHaptic, type HapticIntensity } from "@/lib/haptics";

/** The shared chrome behind every full-bleed list row (CustomerRow,
 *  ProductRow, OrderItemRow, the Orders log).
 *
 *  Composed on the registry's `Item` via `asChild`, which is what lets the
 *  row render as the *right element* — the part that kept going wrong when
 *  each row hand-rolled it. A row that navigates renders a real `<Link>`; a
 *  row that runs a handler renders a real `<button>`; a row that is only a
 *  readout stays a `<div>`. Previously every interactive row was a
 *  `<div onClick>` — unreachable by keyboard and invisible to assistive tech
 *  — and the one list that genuinely navigated worked around that by
 *  wrapping the row in a `<Link>` and passing `onClick={() => {}}` purely to
 *  light up the hover state.
 *
 *  Item's own look (rounded card, `border-border`, `bg-accent/50` on hover)
 *  is overridden throughout: rows here run edge to edge with a hairline
 *  underneath, which is the list rhythm this app uses everywhere.
 *
 *  Pass one of `href` / `onClick`, never both — a row is either a
 *  destination or an action, and nesting a button inside an anchor is
 *  invalid HTML. `href` wins if both arrive, so a stray handler can't
 *  produce that nesting.
 *
 *  `haptic` only applies when the row is interactive (`href` or `onClick`)
 *  — a read-only row stays exactly as it was. The visual press itself is
 *  still the fill above, never a scale (same "reads as a glitch" reasoning);
 *  haptic is additive on top of it, not a replacement. `"use client"` is
 *  safe here the same way it is for Button: nothing in this file needs a
 *  non-serializable prop from a Server Component — the handler a
 *  `href`/`onClick` row needs already has to come from a Client Component
 *  today regardless. */
export function Row({
  href,
  onClick,
  haptic,
  className,
  children,
}: {
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Unset defaults to `"light"` whenever the row is interactive (`href` or
   *  `onClick`); pass `false` to explicitly silence it. */
  haptic?: HapticIntensity | false;
  children?: ReactNode;
  className?: string;
}) {
  const interactive = Boolean(href || onClick);
  const hapticIntensity = haptic ?? (interactive ? "light" : false);

  function handlePointerDown() {
    if (hapticIntensity) fireHaptic(hapticIntensity);
  }

  const shell = cn(
    // `min-w-0` is load-bearing on the `onClick` branch. A grid/flex item's
    // automatic minimum size is its min-content size, and a `<button>` won't
    // shrink below its contents without being told to — so a row inside the
    // order wizard's `grid gap-3` sized its track to the longest customer
    // address on file (1253px inside a 375px screen) and every row in the
    // list ran off the edge, `truncate` and all. The `<div>`/`<Link>`
    // branches don't need it; it costs them nothing.
    "w-full min-w-0 flex-nowrap gap-3 rounded-none border-0 border-b border-line-hairline px-5 py-3 text-left",
    "transition-colors duration-fast ease-standard",
    // A full-bleed row highlights rather than scales — shrinking something
    // pinned to both screen edges reads as a glitch. `active:` is spelled out
    // alongside `hover:` because a touch never produces a hover.
    interactive &&
      "cursor-pointer hover:bg-surface-hover active:bg-surface-hover focus-visible:bg-surface-hover focus-visible:shadow-[var(--focus-ring)] focus-visible:ring-0",
    className,
  );

  if (href) {
    return (
      <Item asChild data-slot="row" className={shell}>
        <Link href={href} className="ds-nav-link" onPointerDown={handlePointerDown}>
          {children}
        </Link>
      </Item>
    );
  }

  if (onClick) {
    return (
      <Item asChild data-slot="row" className={shell}>
        <button type="button" onClick={onClick} onPointerDown={handlePointerDown}>
          {children}
        </button>
      </Item>
    );
  }

  return (
    <Item data-slot="row" className={shell}>
      {children}
    </Item>
  );
}
