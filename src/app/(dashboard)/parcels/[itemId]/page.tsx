import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { withCurrentOrganization } from "@/lib/tenancy";
import { isUuid } from "@/lib/uuid";
import { orderItems, orders, products, customers, orderItemModifiers, modifierOptions } from "@/db/schema";
import { ParcelItemView, type ParcelItemDetail } from "./parcel-item-view";
import type { ParcelStage } from "../parcels-view";

const STAGES = ["purchased", "received", "packed"] as const;

// One item out of the Parcels queue. Only the three in-flight stages resolve
// here: a pending item hasn't been bought yet (it belongs to the Purchase
// Queue) and a completed or cancelled one has nothing left to do, so neither
// has a parcel page to land on.
export default async function ParcelItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  if (!isUuid(itemId)) notFound();

  const item = await withCurrentOrganization(async ({ organizationId, tx }): Promise<ParcelItemDetail | null> => {
    const [row] = await tx
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        orderNumber: orders.orderNumber,
        quantity: orderItems.quantity,
        status: orderItems.status,
        productName: products.name,
        customerName: customers.name,
        purchasedAt: orderItems.purchasedAt,
        receivedAt: orderItems.receivedAt,
        packedAt: orderItems.packedAt,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(
        and(
          eq(orderItems.id, itemId),
          eq(orderItems.organizationId, organizationId),
          inArray(orderItems.status, STAGES),
        ),
      )
      .limit(1);

    if (!row) return null;

    const selections = await tx
      .select({ value: modifierOptions.value })
      .from(orderItemModifiers)
      .innerJoin(modifierOptions, eq(modifierOptions.id, orderItemModifiers.modifierOptionId))
      .where(eq(orderItemModifiers.orderItemId, row.id));

    const status = row.status as ParcelStage;
    const updatedAt =
      (status === "purchased" ? row.purchasedAt : status === "received" ? row.receivedAt : row.packedAt) ?? null;

    return {
      id: row.id,
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      quantity: row.quantity,
      status,
      productName: row.productName,
      customerName: row.customerName,
      selection: selections.map((s) => s.value),
      updatedLabel: updatedAt ? updatedAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—",
    };
  });

  if (!item) notFound();

  return <ParcelItemView item={item} />;
}
