import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { withCurrentOrganization } from "@/lib/tenancy";
import {
  products,
  productImages,
  modifiers,
  modifierOptions,
  productModifierOptions,
} from "@/db/schema";
import { ProductDetailView } from "./product-detail-view";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const data = await withCurrentOrganization(async ({ organizationId, tx }) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.organizationId, organizationId)))
      .limit(1);
    if (!product) return null;

    const images = await tx
      .select({ id: productImages.id, url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.sortOrder));

    // Every modifier in the org, each with its options and whether that
    // option is already attached to this product — enough to render both
    // "currently attached" and "available to add" in one query.
    const rows = await tx
      .select({
        modifierId: modifiers.id,
        modifierName: modifiers.name,
        optionId: modifierOptions.id,
        optionValue: modifierOptions.value,
        attached: productModifierOptions.id,
      })
      .from(modifiers)
      .innerJoin(modifierOptions, eq(modifierOptions.modifierId, modifiers.id))
      .leftJoin(
        productModifierOptions,
        and(
          eq(productModifierOptions.modifierOptionId, modifierOptions.id),
          eq(productModifierOptions.productId, id),
        ),
      )
      .where(eq(modifiers.organizationId, organizationId))
      .orderBy(asc(modifiers.name), asc(modifierOptions.sortOrder));

    const modifierMap = new Map<
      string,
      { name: string; attached: { id: string; value: string }[]; available: { id: string; value: string }[] }
    >();
    for (const row of rows) {
      if (!modifierMap.has(row.modifierId)) {
        modifierMap.set(row.modifierId, { name: row.modifierName, attached: [], available: [] });
      }
      const entry = modifierMap.get(row.modifierId)!;
      (row.attached ? entry.attached : entry.available).push({
        id: row.optionId,
        value: row.optionValue,
      });
    }

    return { product, images, modifierGroups: Array.from(modifierMap.entries()) };
  });

  if (!data) notFound();
  const { product, images, modifierGroups } = data;

  return <ProductDetailView product={product} images={images} modifierGroups={modifierGroups} />;
}
