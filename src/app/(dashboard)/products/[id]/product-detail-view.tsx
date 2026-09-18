"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ToastFromQuery } from "@/components/toast-from-query";
import { Screen, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageUploadField } from "@/components/image-upload-field";
import {
  attachModifierOptionsAction,
  detachModifierOptionAction,
  setProductStatusAction,
  updateProductAction,
} from "../actions";
import { AddModifierForm } from "../add-modifier-form";

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  price: string | null;
  sourceUrl: string | null;
  status: "active" | "archived";
}

interface ModifierGroup {
  name: string;
  attached: { id: string; value: string }[];
  available: { id: string; value: string }[];
}

/** Client-side counterpart to the server page — same markup, but every
 *  mutation runs through a try/catch so it can toast, rather than a plain
 *  `<form action={serverAction}>` whose thrown validation error would
 *  otherwise surface as Next's own error boundary instead of a message. */
export function ProductDetailView({
  product,
  images,
  modifierGroups,
}: {
  product: ProductDetail;
  images: { id: string; url: string }[];
  modifierGroups: [string, ModifierGroup][];
}) {
  const [pending, startTransition] = useTransition();

  function toggleStatus() {
    startTransition(async () => {
      try {
        await setProductStatusAction(product.id, product.status === "active" ? "archived" : "active");
        toast.success(product.status === "active" ? `${product.name} archived.` : `${product.name} unarchived.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't update that product.");
      }
    });
  }

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      try {
        await updateProductAction(formData);
        toast.success("Product updated.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't save those changes.");
      }
    });
  }

  function detachOption(modifierOptionId: string) {
    startTransition(async () => {
      try {
        await detachModifierOptionAction(product.id, modifierOptionId);
        toast.success("Modifier option removed.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't remove that option.");
      }
    });
  }

  function attachOptions(formData: FormData) {
    startTransition(async () => {
      try {
        await attachModifierOptionsAction(formData);
        toast.success("Modifier options added.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't add those options.");
      }
    });
  }

  return (
    <Screen>
      <ToastFromQuery param="created" message="Product created." />
      <TopBar
        title={product.name}
        backHref="/products"
        right={
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={toggleStatus}>
            {product.status === "active" ? "Archive" : "Unarchive"}
          </Button>
        }
      />
      <ScrollBody>
        <div className="grid gap-4 px-5 py-4">
          <div className="flex items-center gap-2">
            {product.status === "archived" ? <Badge tone="quiet">Archived</Badge> : <Badge tone="accent">Active</Badge>}
          </div>

          <form action={handleUpdate} className="grid gap-4">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Name" required>
              <Input name="name" icon="package" autoComplete="off" defaultValue={product.name} />
            </Field>
            <Field label="Description" required>
              <Textarea name="description" rows={3} defaultValue={product.description} />
            </Field>
            <Field label="Price" required>
              <Input
                name="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                icon="coins"
                suffix="MMK"
                defaultValue={product.price ?? ""}
              />
            </Field>
            <Field label="Images">
              <ImageUploadField initialImages={images} />
            </Field>
            <Field label="Source URL" hint="Link to the exact Lazada/TikTok Shop listing.">
              <Input name="sourceUrl" type="url" icon="link" defaultValue={product.sourceUrl ?? ""} placeholder="https://…" />
            </Field>
            {product.sourceUrl && (
              <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="-mt-2 font-ui text-small-strong">
                View current listing
              </a>
            )}

            <Button full type="submit" icon="check" disabled={pending}>
              Save changes
            </Button>
          </form>

          <section className="grid gap-3">
            <span className="font-mono text-label tracking-label uppercase text-text-faint">Modifiers</span>

            {modifierGroups.length === 0 && <p className="font-ui text-small text-text-muted">No modifiers in your catalog yet.</p>}

            {modifierGroups.map(([modifierId, group]) => (
              <div key={modifierId} className="grid gap-2 rounded-md border border-line-hairline p-3">
                <p className="font-ui text-body-strong text-text-strong">{group.name}</p>

                {group.attached.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {group.attached.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        title="Remove"
                        disabled={pending}
                        onClick={() => detachOption(option.id)}
                        className="cursor-pointer rounded-full border-none bg-surface-raised px-2.5 py-1 font-ui text-small text-text-strong"
                      >
                        {option.value} ✕
                      </button>
                    ))}
                  </div>
                )}

                {group.available.length > 0 && (
                  <form action={attachOptions} className="grid gap-2">
                    <input type="hidden" name="productId" value={product.id} />
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {group.available.map((option) => (
                        <CheckboxField key={option.id} name="modifierOptionIds" value={option.id}>
                          {option.value}
                        </CheckboxField>
                      ))}
                    </div>
                    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
                      Add selected
                    </Button>
                  </form>
                )}
              </div>
            ))}

            <AddModifierForm productId={product.id} />
          </section>
        </div>
      </ScrollBody>
    </Screen>
  );
}
