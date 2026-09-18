"use client";

import * as React from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import { fireHaptic } from "@/lib/haptics";
import { useRipple } from "@/lib/use-ripple";
import { TactileRipple } from "@/components/ui/tactile-ripple";

const GLYPH = { "icon-sm": 15, icon: 18, "icon-lg": 22 } as const;

/** An icon-only tap target — TopBar actions, sheet close buttons.
 *
 *  A thin wrapper over Button's `icon-*` sizes rather than a second button
 *  implementation (it used to be one, with its own hover, focus ring and
 *  disabled handling that drifted from Button's). Two things justify the
 *  wrapper over calling `<Button size="icon">` directly:
 *
 *  - `label` is REQUIRED and becomes the accessible name. A control with no
 *    text is invisible to assistive tech otherwise, and a plain Button can't
 *    make that mandatory at the type level.
 *  - `href` renders a real `<Link>`. Every navigating call site had wrapped
 *    this in one, producing `<a><button></button></a>` — invalid HTML that
 *    announces two nested controls.
 *
 *  `variant` maps onto Button's: solid → the bordered chrome used for a
 *  TopBar's primary action, ghost → everything else.
 *
 *  `href` renders a `<Link>` directly on `buttonVariants` rather than going
 *  through `<Button asChild>` — Button disables `haptic`/`ripple` in
 *  `asChild` mode (Slot clones a single child, so a ripple span can't be
 *  injected alongside it), which silently no-op'd both on every navigating
 *  icon button. Duplicating Button's small tactile bit here is what makes
 *  `ripple` actually work on a "New order"/"Add product" style button. */
function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "icon",
  href,
  haptic,
  ripple = false,
  className,
  onPointerDown,
  ...props
}: Omit<
  React.ComponentProps<typeof Button>,
  "variant" | "size" | "icon" | "iconAfter" | "children" | "asChild" | "full"
> & {
  icon: IconName;
  label: string;
  variant?: "ghost" | "solid";
  size?: keyof typeof GLYPH;
  href?: string;
}) {
  const glyph = <Icon name={icon} size={GLYPH[size]} />;
  const mappedVariant = variant === "solid" ? ("secondary" as const) : ("ghost" as const);
  const hapticIntensity = haptic ?? false;
  const tactile = hapticIntensity !== false || ripple;
  const { ripples, onPointerDown: onRipplePointerDown, clearRipple } = useRipple();
  // Widened because this same handler wires up either the <Link> or the
  // <button> branch below — Button's own prop type pins it to
  // HTMLButtonElement, which the href branch's <a> genuinely isn't.
  const onExternalPointerDown = onPointerDown as ((e: React.PointerEvent<HTMLElement>) => void) | undefined;

  function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
    if (hapticIntensity) fireHaptic(hapticIntensity);
    if (ripple) onRipplePointerDown(e);
    onExternalPointerDown?.(e);
  }

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        title={label}
        onPointerDown={handlePointerDown}
        className={cn(
          buttonVariants({ variant: mappedVariant, size }),
          tactile && "ease-spring active:scale-[0.96]",
          ripple && "relative overflow-hidden",
          "ds-nav-link",
          className,
        )}
      >
        {glyph}
        {ripple ? <TactileRipple ripples={ripples} onDone={clearRipple} /> : null}
      </Link>
    );
  }

  return (
    <Button
      data-slot="icon-button"
      aria-label={label}
      title={label}
      variant={mappedVariant}
      size={size}
      haptic={haptic}
      ripple={ripple}
      onPointerDown={onPointerDown}
      className={className}
      {...props}
    >
      {glyph}
    </Button>
  );
}

export { IconButton };
