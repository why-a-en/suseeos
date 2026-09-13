"use client";

import { useState } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { IconButton } from "@/components/ui/icon-button";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/**
 * One or more Modifier blocks (name + its Options), each posted as a
 * repeated `name="modifierName"` / `name="modifierOptions"` pair — the
 * server actions zip them back together by position (see
 * `parseModifierBlocks` in products/actions.ts). Blocks are uncontrolled;
 * this component only tracks *how many* there are and their React keys, the
 * same division of labour TagInput already has with its own hidden input.
 *
 * Replaces two things that used to be separate and both undersized:
 * `/products/new` could only capture one Modifier at creation (every
 * further one meant leaving the form, landing on the product's own page,
 * and coming back — see docs/PRD.md §6.1, now updated), and that product
 * page's "add another" was a bare `<details><summary>+ New modifier` — an
 * ASCII plus in link-blue, the one control in the app that never got a
 * design pass. Both now render this: a stack of cards with an explicit
 * remove, and one dashed "Add modifier" row to grow the stack, styled like
 * the rest of the kit's controls (icon + label, felt press) instead of a
 * native disclosure marker.
 */
export function ModifierFieldsList({
  nameField = "modifierName",
  optionsField = "modifierOptions",
  addLabel = "Add modifier",
}: {
  nameField?: string;
  optionsField?: string;
  addLabel?: string;
}) {
  const [blocks, setBlocks] = useState<string[]>(() => [crypto.randomUUID()]);

  function addBlock() {
    setBlocks((prev) => [...prev, crypto.randomUUID()]);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b !== id));
  }

  return (
    <div className="grid gap-3">
      {blocks.map((id, index) => (
        <div key={id} className="grid gap-4 rounded-md border border-line-hairline p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-label tracking-label uppercase text-text-faint">
              Modifier{blocks.length > 1 ? ` ${index + 1}` : ""}
            </span>
            {blocks.length > 1 && (
              <IconButton icon="x" label="Remove this modifier" size="icon-sm" onClick={() => removeBlock(id)} />
            )}
          </div>
          <Field label="Name" hint="What varies — size, colour, material">
            <Input name={nameField} icon="tag" autoComplete="off" placeholder="Colour" />
          </Field>
          <Field label="Options" hint="Press Enter after each">
            <TagInput name={optionsField} icon="list" placeholder="Black, White, Red" />
          </Field>
        </div>
      ))}

      <button
        type="button"
        onClick={addBlock}
        className={cn(
          "flex items-center justify-center gap-2 rounded-md border border-dashed border-line-strong py-2.5",
          "font-ui text-small-strong text-text-strong",
          "transition-[background-color,scale] duration-fast ease-standard",
          "hover:bg-surface-hover active:scale-[0.985] active:bg-surface-hover",
        )}
      >
        <Icon name="plus" size={15} />
        {addLabel}
      </button>
    </div>
  );
}
