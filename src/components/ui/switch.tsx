"use client";

import type { ComponentProps, ReactNode } from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * A sliding on/off switch — the thumb travels, the track inverts.
 *
 * Distinct from `Toggle`, which is a pill that fills when pressed: a Toggle
 * says "this option is selected", a Switch says "this thing is on", and the
 * travel is what carries that. Radix's primitive underneath, so it's a real
 * `role="switch"` with `aria-checked`, Space/Enter, and a `<label>`
 * association — none of which a styled `<button>` gets for free.
 *
 * Monochrome, so neither state can lean on hue. The track therefore stays
 * put and only the thumb moves: it's always the accent — the heaviest fill
 * the theme owns (see toggle.tsx) — on an unchanging sunken track.
 *
 * An earlier version inverted the whole control instead (light thumb on a
 * dark track flipping to a dark thumb on a near-white one), which gave a
 * much stronger on/off contrast and looked wrong for it: the bright element
 * swapped from thumb to track mid-travel, so it read as two objects trading
 * places rather than one sliding. Position and the glyph carry the state
 * here; the control keeps one identity throughout.
 *
 * `ease-spring` on the thumb's travel, dropping to `ease-standard` while the
 * control is held: an overshoot settling into place reads as a physical
 * switch, but an overshoot on the way *in* wobbles right when the tap should
 * register instantly. A transition's timing function comes from the rule for
 * the state being transitioned *to*, so scoping `ease-standard` to the
 * pressed state overrides only the entry. Same reasoning, same pairing as
 * Button and Toggle.
 */
export function Switch({
  className,
  thumbIcon,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root> & {
  /** Sits inside the travelling thumb — the one thing that lets a switch
   *  stand on its own without a text label beside it. */
  thumbIcon?: ReactNode;
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border border-line-hairline bg-surface-sunken p-0.5 outline-none",
        "transition-[border-color,scale] duration-fast ease-standard",
        // Compact control, so the icon-target press scale (CLAUDE.md §Press).
        "active:scale-95 focus-visible:shadow-[var(--focus-ring)]",
        "disabled:pointer-events-none disabled:opacity-[0.42]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none flex size-[26px] items-center justify-center rounded-full bg-accent text-accent-ink shadow-raised",
          // 56px track − 2px border − 4px padding − 26px thumb = 24px travel.
          "translate-x-0 data-[state=checked]:translate-x-6",
          "transition-transform duration-fast ease-spring group-active/switch:ease-standard",
        )}
      >
        {thumbIcon}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}
