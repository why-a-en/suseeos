import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Sticky group divider inside a scrolling list — a date, a status, a letter.
 *
 *  11px rather than the 10px `--text-label` the rest of the micro-labels use,
 *  and `--text-muted` rather than the `--text-faint` floor: at 10px/faint
 *  these read as machine labels stamped on the page rather than as headings,
 *  which is a problem specific to *this* use — a badge or an eyebrow is
 *  attached to the thing it labels, while a section header has to hold its
 *  own above a block of full-size rows. Deliberately not bumped by changing
 *  `--text-label` itself, which would drag Badge, StatTile and TopBar's
 *  eyebrow along with it. `--text-muted` clears contrast everywhere
 *  `--text-faint` already did (it is strictly the stronger of the two in both
 *  themes — see colors.css). */
export function SectionHeader({
  children,
  right,
  sticky = true,
  className,
}: {
  children?: ReactNode;
  right?: ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "z-[5] flex items-center justify-between gap-2 bg-surface-page px-5 pt-2.5 pb-2 font-mono text-[11px] tracking-label uppercase text-text-muted",
        sticky && "sticky top-0",
        className,
      )}
    >
      <span>{children}</span>
      {right ? <span>{right}</span> : null}
    </div>
  );
}
