"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { requireUser } from "@/lib/auth";
import { withCurrentOrganization } from "@/lib/tenancy";
import {
  products,
  productImages,
  modifiers,
  modifierOptions,
  productModifierOptions,
} from "@/db/schema";
import { getUploadUrl, buildImageKey } from "@/lib/storage";

/**
 * Reads however many `nameField`/`optionsField` pairs the form submitted —
 * one per Modifier block (see ModifierFieldsList) — and zips them back
 * together by position. `getAll` returns values in DOM order, and every
 * block always renders both fields together, so a block's name and its
 * options land at the same index in each list.
 *
 * A block with no name or no options is dropped rather than rejected: an
 * agent who clicked "Add modifier" and then decided against it shouldn't
 * see an error for leaving it blank.
 */
function parseModifierBlocks(formData: FormData, nameField: string, optionsField: string) {
  const names = formData.getAll(nameField).map((v) => String(v).trim());
  const optionsRaw = formData.getAll(optionsField).map((v) => String(v));
  return names
    .map((name, i) => ({
      name,
      options: (optionsRaw[i] ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    }))
    .filter((block) => block.name && block.options.length > 0);
}

/**
 * Creates each parsed Modifier block (a new, Organization-wide Modifier and
 * its Options) and attaches every one of those Options to `productId` —
 * the shared insert behind both `createProductAction`'s first-Modifier-or-
 * several case and `createModifierAction`'s "add another" on the product
 * page. Same statement shape either way; only the number of blocks differs.
 */
async function insertModifierBlocks(
  tx: Db,
  organizationId: string,
  productId: string,
  blocks: { name: string; options: string[] }[],
) {
  for (const block of blocks) {
    const [modifier] = await tx
      .insert(modifiers)
      .values({ organizationId, name: block.name })
      .returning({ id: modifiers.id });

    const insertedOptions = await tx
      .insert(modifierOptions)
      .values(
        block.options.map((value, index) => ({
          organizationId,
          modifierId: modifier.id,
          value,
          sortOrder: index,
        })),
      )
      .returning({ id: modifierOptions.id });

    await tx.insert(productModifierOptions).values(
      insertedOptions.map((option) => ({
        organizationId,
        productId,
        modifierOptionId: option.id,
      })),
    );
  }
}

/**
 * Hands the browser a short-lived URL it can PUT an image to directly
 * (src/lib/storage.ts) — called from the client image-upload widget before
 * the main product form is submitted, not as a form action itself.
 */
export async function getProductImageUploadUrlAction(filename: string, contentType: string) {
  const user = await requireUser();
  const key = buildImageKey(user.organizationId, "product", filename);
  return getUploadUrl(key, contentType);
}

/**
 * Creates the product, its images (already uploaded to R2 by the time this
 * runs — see getProductImageUploadUrlAction), and — visibly on the same
 * form, not a separate step — as many Modifiers as the agent added (see
 * ModifierFieldsList; docs/PRD.md §6.1). Picking from *existing* Modifiers
 * instead of creating new ones still happens on the product's own page
 * after this — this form only covers creating new ones inline.
 */
export async function createProductAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim() || null;
  const price = String(formData.get("price") ?? "").trim();
  const imageUrls = formData.getAll("imageUrls").map(String).filter(Boolean);
  const modifierBlocks = parseModifierBlocks(formData, "modifierName", "modifierOptions");

  if (!name || !description) {
    throw new Error("Name and description are required.");
  }
  if (!price || Number.isNaN(Number(price)) || Number(price) < 0) {
    throw new Error("Enter a valid price.");
  }

  const productId = await withCurrentOrganization(async ({ organizationId, userId, tx }) => {
    const [product] = await tx
      .insert(products)
      .values({ organizationId, name, description, sourceUrl, price, createdBy: userId })
      .returning({ id: products.id });

    if (imageUrls.length > 0) {
      await tx.insert(productImages).values(
        imageUrls.map((url, index) => ({
          organizationId,
          productId: product.id,
          url,
          sortOrder: index,
        })),
      );
    }

    await insertModifierBlocks(tx, organizationId, product.id, modifierBlocks);

    return product.id;
  });

  revalidatePath("/products");
  redirect(`/products/${productId}`);
}

/**
 * Edits a product's own fields — name, description, price, source URL, and
 * its image set — the "Edit" half of docs/PRD.md §5.1 that only Archive
 * ever shipped for. Modifiers stay out of this action entirely: attaching,
 * detaching, and creating new ones already have their own actions below,
 * scoped to the product page's Modifiers section rather than this form.
 *
 * Images: `imageUrls` are freshly uploaded (ImageUploadField, same as
 * creation) and get appended after whatever sort order already exists;
 * `removedImageIds` names existing rows the agent cleared in the same
 * field, deleted here rather than on every checkbox toggle so a removal
 * is undoable (by not submitting) right up until Save.
 */
export async function updateProductAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim() || null;
  const price = String(formData.get("price") ?? "").trim();
  const newImageUrls = formData.getAll("imageUrls").map(String).filter(Boolean);
  const removedImageIds = formData.getAll("removedImageIds").map(String).filter(Boolean);

  if (!productId) throw new Error("Missing product.");
  if (!name || !description) {
    throw new Error("Name and description are required.");
  }
  if (!price || Number.isNaN(Number(price)) || Number(price) < 0) {
    throw new Error("Enter a valid price.");
  }

  await withCurrentOrganization(async ({ organizationId, tx }) => {
    await tx
      .update(products)
      .set({ name, description, sourceUrl, price, updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.organizationId, organizationId)));

    if (removedImageIds.length > 0) {
      await tx
        .delete(productImages)
        .where(
          and(
            eq(productImages.productId, productId),
            eq(productImages.organizationId, organizationId),
            inArray(productImages.id, removedImageIds),
          ),
        );
    }

    if (newImageUrls.length > 0) {
      const [{ maxSort } = { maxSort: -1 }] = await tx
        .select({ maxSort: sql<number>`coalesce(max(${productImages.sortOrder}), -1)` })
        .from(productImages)
        .where(eq(productImages.productId, productId));

      await tx.insert(productImages).values(
        newImageUrls.map((url, index) => ({
          organizationId,
          productId,
          url,
          sortOrder: maxSort + 1 + index,
        })),
      );
    }
  });

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  redirect(`/products/${productId}`);
}

/**
 * The same insert as `createProductAction`, for the one caller that can't
 * use it: the order wizard's inline "new product" sub-step.
 *
 * Two things make the form action above unusable mid-wizard. It ends in a
 * `redirect` to the new product's page, which would throw away a cart the
 * wizard is holding in client state and never wrote anywhere; and it takes
 * FormData, whereas the wizard needs the created row back so it can drop
 * the product straight into the list and let the agent add it to the order
 * without a round-trip. Same relationship `createCustomerAction` has to the
 * customer sheet — one action, both surfaces.
 *
 * Carries the same optional first Modifier as the full form — someone
 * capturing a product mid-order is recording exactly what the customer
 * asked for, and "the red one" is part of that. Still no images: an upload
 * widget inside a wizard sub-step on a phone is a lot of screen for
 * something nobody is waiting on, and photos are catalog curation for the
 * product's own page. The created Modifier (if any) comes back in the
 * shape the wizard's picker renders, so its options are pickable the
 * instant the product lands.
 */
export async function createProductInlineAction(input: {
  name: string;
  description: string;
  price?: string;
  sourceUrl?: string;
  modifierName?: string;
  modifierOptions?: string[];
}): Promise<{
  id: string;
  name: string;
  price: string;
  sourceUrl: string | null;
  modifierGroups: { id: string; name: string; options: { id: string; value: string }[] }[];
}> {
  const name = input.name.trim();
  const description = input.description.trim();
  const price = input.price?.trim() ?? "";
  const sourceUrl = input.sourceUrl?.trim() || null;
  const modifierName = input.modifierName?.trim() ?? "";
  const modifierOptionValues = (input.modifierOptions ?? [])
    .map((v) => v.trim())
    .filter(Boolean);

  if (!name) throw new Error("Name is required.");
  if (!description) throw new Error("Description is required.");
  if (!price || Number.isNaN(Number(price)) || Number(price) < 0) throw new Error("Enter a valid price.");

  const product = await withCurrentOrganization(async ({ organizationId, userId, tx }) => {
    const [row] = await tx
      .insert(products)
      .values({ organizationId, name, description, sourceUrl, price, createdBy: userId })
      .returning({ id: products.id, name: products.name, price: products.price, sourceUrl: products.sourceUrl });

    const modifierGroups: { id: string; name: string; options: { id: string; value: string }[] }[] = [];
    if (modifierName && modifierOptionValues.length > 0) {
      const [modifier] = await tx
        .insert(modifiers)
        .values({ organizationId, name: modifierName })
        .returning({ id: modifiers.id });

      const insertedOptions = await tx
        .insert(modifierOptions)
        .values(
          modifierOptionValues.map((value, index) => ({
            organizationId,
            modifierId: modifier.id,
            value,
            sortOrder: index,
          })),
        )
        .returning({ id: modifierOptions.id, value: modifierOptions.value });

      await tx.insert(productModifierOptions).values(
        insertedOptions.map((option) => ({
          organizationId,
          productId: row.id,
          modifierOptionId: option.id,
        })),
      );

      modifierGroups.push({ id: modifier.id, name: modifierName, options: insertedOptions });
    }

    return { ...row, price: row.price ?? price, modifierGroups };
  });

  revalidatePath("/products");
  return product;
}

export async function setProductStatusAction(productId: string, status: "active" | "archived") {
  await withCurrentOrganization(async ({ organizationId, tx }) => {
    await tx
      .update(products)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.organizationId, organizationId)));
  });
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
}

/**
 * Creates one or more brand-new Modifiers (e.g. "Color", each with its own
 * Options) and immediately attaches all of them to `productId` — for
 * adding further Modifiers from the product's own page, after creation.
 * Same ModifierFieldsList and the same parseModifierBlocks/
 * insertModifierBlocks pair `createProductAction` uses, so a Support Agent
 * isn't limited to one at a time here either.
 */
export async function createModifierAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const blocks = parseModifierBlocks(formData, "modifierName", "modifierOptions");

  if (!productId || blocks.length === 0) {
    throw new Error("Modifier name and at least one option are required.");
  }

  await withCurrentOrganization(async ({ organizationId, tx }) => {
    await insertModifierBlocks(tx, organizationId, productId, blocks);
  });

  revalidatePath(`/products/${productId}`);
}

/** Attaches a subset of an *existing* Modifier's Options to a product. */
export async function attachModifierOptionsAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const modifierOptionIds = formData.getAll("modifierOptionIds").map(String);

  if (!productId || modifierOptionIds.length === 0) return;

  await withCurrentOrganization(async ({ organizationId, tx }) => {
    await tx
      .insert(productModifierOptions)
      .values(
        modifierOptionIds.map((modifierOptionId) => ({
          organizationId,
          productId,
          modifierOptionId,
        })),
      )
      .onConflictDoNothing();
  });

  revalidatePath(`/products/${productId}`);
}

export async function detachModifierOptionAction(productId: string, modifierOptionId: string) {
  await withCurrentOrganization(async ({ organizationId, tx }) => {
    await tx
      .delete(productModifierOptions)
      .where(
        and(
          eq(productModifierOptions.organizationId, organizationId),
          eq(productModifierOptions.productId, productId),
          eq(productModifierOptions.modifierOptionId, modifierOptionId),
        ),
      );
  });
  revalidatePath(`/products/${productId}`);
}
