"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/icon";
import { fireHaptic, type HapticIntensity } from "@/lib/haptics";

/** The system is monochrome, so press is *felt*, not coloured: primary opens
 *  a soft ring under the cursor (--ring-soft) and widens its own tracking a
 *  hair on hover, and every variant scales down fractionally when pressed.
 *  None of that needs JS state — :hover/:active/:disabled cover it natively,
 *  which also makes press register on touch (the mouse-event-only version
 *  this replaces never did).
 *
 *  `haptic` (below) is an additive, opt-in exception to that "no JS" rule —
 *  a vibration is the one thing CSS genuinely can't do. It doesn't touch the
 *  `:active` scale mechanism itself: it only swaps `ease-standard` for the
 *  springier `ease-spring` and deepens the scale a touch, still driven by
 *  `:active`. (A ripple effect briefly lived here too and was pulled — it
 *  read as a stray flash rather than an intentional effect.)
 *  `"use client"` here is safe — no Server Component call site passes a
 *  non-serializable prop (onClick etc.) to Button today, only `type`,
 *  `icon`/`iconAfter`, and children (all serializable), so this doesn't
 *  break any `<form action={serverAction}><Button type="submit">` usage.
 *
 *  `disabled:pointer-events-none` is load-bearing beyond the cursor: it also
 *  suppresses every hover rule below, so a disabled button can't light up.
 *
 *  NOTE: `npx shadcn add <anything>` will overwrite this file back to stock —
 *  it treats button as a dependency of several components. If a shadcn add
 *  reports "Updated: button.tsx", restore this before committing. */
const buttonVariants = cva(
  [
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm font-ui whitespace-nowrap outline-none",
    "tracking-[0.005em] transition-[background,color,box-shadow,letter-spacing,scale] duration-fast ease-standard",
    "active:scale-[0.985] focus-visible:shadow-[var(--focus-ring)]",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-[0.42]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "border border-transparent bg-accent font-bold text-accent-ink shadow-[0_0_0_0_var(--color-ring-soft)] hover:shadow-[0_0_0_4px_var(--color-ring-soft)] hover:tracking-[0.015em] active:shadow-[0_0_0_7px_var(--color-ring-soft)]",
        secondary:
          "border border-line-strong bg-transparent font-semibold text-text-strong hover:border-surface-invert hover:bg-surface-invert hover:text-text-invert",
        ghost: "border border-transparent bg-transparent font-semibold text-text-body hover:bg-surface-hover",
        // Destructive intent is carried by the hatch band and the strongest
        // ink, never by red — pair it with an explicit verb at the call site,
        // since density says "careful" but not which direction the action goes.
        danger: "border border-line-strong bg-danger-wash font-bold text-danger",
      },
      size: {
        sm: "h-(--control-h-sm) min-w-(--control-h-sm) px-3 text-[13px]",
        md: "h-(--control-h-md) min-w-(--control-h-md) px-[18px] text-[15px]",
        lg: "h-(--control-h-lg) min-w-(--control-h-lg) px-[22px] text-[16px]",
        // Icon-only: square, no label padding. IconButton wraps these and is
        // what call sites use — it makes the accessible name mandatory,
        // which a bare Button can't enforce for a control with no text.
        "icon-sm": "size-9 p-0",
        icon: "size-11 p-0",
        "icon-lg": "size-(--control-h-lg) p-0",
      },
      full: { true: "w-full" },
    },
    compoundVariants: [
      // The hatch band eats into the leading padding rather than sitting
      // outside it, so a danger button keeps the same optical weight as its
      // peers in a stacked footer.
      { variant: "danger", size: "sm", class: "pl-1" },
      { variant: "danger", size: "md", class: "pl-[5px]" },
      { variant: "danger", size: "lg", class: "pl-[5px]" },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

/** Sensible per-variant default for `haptic` when the prop is left
 *  unset — `false` (not `undefined`) always means "explicitly off",
 *  distinct from "unset, use the variant's default". Primary is the button
 *  an agent taps to make something happen; danger is a destructive/confirm
 *  action, so it gets the stronger buzz. Secondary/ghost stay silent unless
 *  a call site opts in — most of those are "Back", "Cancel", low-stakes. */
function defaultHapticFor(variant: NonNullable<VariantProps<typeof buttonVariants>["variant"]>): HapticIntensity | false {
  if (variant === "danger") return "strong";
  if (variant === "primary") return "light";
  return false;
}

function Button({
  className,
  variant,
  size = "md",
  full,
  icon,
  iconAfter,
  asChild = false,
  haptic,
  onPointerDown,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the caller's own element (a Link, usually) with these styles.
     *  Radix's Slot clones a *single* child, so the `icon`/`iconAfter`
     *  conveniences and the danger hatch are not injected in this mode —
     *  compose them inside the child element instead. */
    asChild?: boolean;
    /** Icon rendered before the label. */
    icon?: IconName;
    iconAfter?: IconName;
    /** `navigator.vibrate` pulse on pointerdown (src/lib/haptics.ts).
     *  Unset uses the variant's own default (primary "light", danger
     *  "strong", otherwise off) — pass `false` to explicitly silence it. */
    haptic?: HapticIntensity | false;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  const iconSize = size === "sm" ? 15 : 17;
  const resolvedVariant = variant ?? "primary";
  const hapticIntensity = haptic ?? defaultHapticFor(resolvedVariant);
  const tactile = !asChild && hapticIntensity !== false;

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (hapticIntensity) fireHaptic(hapticIntensity);
    onPointerDown?.(e);
  }

  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "primary"}
      type={asChild ? undefined : ((props.type ?? "button") as "button" | "submit" | "reset")}
      onPointerDown={handlePointerDown}
      className={cn(buttonVariants({ variant, size, full, className }), tactile && "ease-spring active:scale-[0.96]")}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {variant === "danger" ? (
            <span
              aria-hidden="true"
              className={cn(
                "ds-hatch my-1 mr-1 shrink-0 self-stretch rounded-[calc(var(--radius-sm)-4px)]",
                size === "sm" ? "w-2.5" : "w-[13px]",
              )}
            />
          ) : null}
          {icon ? <Icon name={icon} size={iconSize} /> : null}
          {children}
          {iconAfter ? <Icon name={iconAfter} size={iconSize} /> : null}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
