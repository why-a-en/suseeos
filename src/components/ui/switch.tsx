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
 * Monochrome, so both states have to read without hue. Rather than the usual
 * grey→colour track (which collapses to grey→grey here), the whole control
 * inverts: off is a light thumb on a dark track, on is a dark thumb on the
 * accent's near-white fill. Same rule the rest of the kit follows — selection
 * is the heaviest fill in the row, never a colour (see toggle.tsx).
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
        "group/switch relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border border-line-hairline p-0.5 outline-none",
        "bg-surface-raised data-[state=checked]:bg-accent",
        "transition-[background-color,border-color,scale] duration-fast ease-standard",
        // Compact control, so the icon-target press scale (CLAUDE.md §Press).
        "active:scale-95 focus-visible:shadow-[var(--focus-ring)]",
        "disabled:pointer-events-none disabled:opacity-[0.42]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none flex size-[26px] items-center justify-center rounded-full shadow-raised",
          "bg-surface-invert text-text-invert data-[state=checked]:bg-accent-ink data-[state=checked]:text-accent",
          // 56px track − 2px border − 4px padding − 26px thumb = 24px travel.
          "translate-x-0 data-[state=checked]:translate-x-6",
          "transition-[transform,background-color,color] duration-fast ease-spring group-active/switch:ease-standard",
        )}
      >
        {thumbIcon}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}
