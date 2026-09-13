"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { ModifierFieldsList } from "@/components/ui/modifier-fields";
import { createModifierAction } from "./actions";
import { cn } from "@/lib/utils";

/**
 * Replaces the product page's old `<details><summary>+ New modifier`
 * disclosure — a native marker in link-blue that was the one control here
 * that never got the design-system pass. Closed, this is the same dashed
 * "Add modifier" row ModifierFieldsList itself uses to grow its own stack,
 * so the two don't read as different affordances. Opened, it's that same
 * list (now able to hold several new Modifiers in one submit, not just
 * one) plus Cancel/Create actions.
 *
 * Collapses itself back on success — `createModifierAction`'s
 * `revalidatePath` has already refreshed the Modifiers section above by
 * the time the awaited call resolves, so the newly attached Modifier is
 * visible the moment this closes.
 */
export function AddModifierForm({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-center gap-2 rounded-md border border-dashed border-line-strong py-2.5",
          "font-ui text-small-strong text-text-strong",
          "transition-[background-color,scale] duration-fast ease-standard",
          "hover:bg-surface-hover active:scale-[0.985] active:bg-surface-hover",
        )}
      >
        <Icon name="plus" size={15} />
        Add modifier
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await createModifierAction(formData);
        setOpen(false);
      }}
      className="grid gap-3 rounded-md border border-line-hairline p-3"
    >
      <input type="hidden" name="productId" value={productId} />
      <ModifierFieldsList />
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" icon="check">
          Create and attach
        </Button>
      </div>
    </form>
  );
}
