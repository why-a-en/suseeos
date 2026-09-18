"use client";

import { useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/image-upload-field";
import { ModifierFieldsList } from "@/components/ui/modifier-fields";
import { createProductAction } from "../actions";

/** Wraps createProductAction (which redirects on success, throws on
 *  validation failure) in try/catch so a validation error surfaces as a
 *  toast instead of hitting Next's own error boundary — a plain
 *  `<form action={createProductAction}>` had no client hook to catch it. */
export function NewProductForm() {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createProductAction(formData);
      } catch (e) {
        unstable_rethrow(e);
        toast.error(e instanceof Error ? e.message : "Couldn't create that product.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4 px-5 pt-4 pb-8">
      <Field label="Name" required>
        <Input name="name" icon="package" autoComplete="off" placeholder="Denim jacket" />
      </Field>
      <Field label="Description" required>
        <Textarea name="description" rows={3} placeholder="Colour, fabric, fit — anything the customer should know" />
      </Field>
      <Field label="Price" required>
        <Input name="price" type="number" inputMode="decimal" step="0.01" min="0" icon="coins" suffix="MMK" placeholder="15000" />
      </Field>
      <Field label="Images">
        <ImageUploadField />
      </Field>
      <Field label="Source URL" hint="Link to the exact Lazada/TikTok Shop listing.">
        <Input name="sourceUrl" type="url" icon="link" placeholder="https://…" />
      </Field>

      <div className="grid gap-2">
        <div className="grid gap-1">
          <span className="font-mono text-label tracking-label uppercase text-text-faint">Modifiers (optional)</span>
          <p className="font-ui text-small text-text-faint">
            Things that vary, and the choices for each. The team picks one option per Modifier when adding this product to an order.
          </p>
        </div>
        <ModifierFieldsList />
      </div>

      <Button full type="submit" icon="check" disabled={pending}>
        {pending ? "Saving…" : "Save product"}
      </Button>
    </form>
  );
}
