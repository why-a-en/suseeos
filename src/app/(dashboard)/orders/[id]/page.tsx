import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { withCurrentOrganization } from "@/lib/tenancy";
import { isUuid } from "@/lib/uuid";
import {
  orders,
  orderItems,
  orderItemModifiers,
  modifierOptions,
  products,
  customers,
} from "@/db/schema";
import { OrderDetailView } from "./order-detail-view";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params;

  // orders.id is a uuid column — a non-UUID segment (a typo, a stale link, a
  // bot probing routes) would otherwise crash the query with a raw Postgres
  // "invalid input syntax for type uuid" error instead of a normal 404.
  if (!isUuid(orderId)) notFound();

  const data = await withCurrentOrganization(async ({ organizationId, tx }) => {
    const [order] = await tx
      .select({
        id: orders.id,
        notes: orders.notes,
        createdAt: orders.createdAt,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerAddress: customers.address,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(and(eq(orders.id, orderId), eq(orders.organizationId, organizationId)))
      .limit(1);
    if (!order) return null;

    const items = await tx
      .select({
        id: orderItems.id,
        productName: products.name,
        quantity: orderItems.quantity,
        status: orderItems.status,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.createdAt));

    const itemIds = items.map((item) => item.id);
    const modifierRows =
      itemIds.length === 0
        ? []
        : await tx
            .select({ orderItemId: orderItemModifiers.orderItemId, value: modifierOptions.value })
            .from(orderItemModifiers)
            .innerJoin(modifierOptions, eq(modifierOptions.id, orderItemModifiers.modifierOptionId))
            .where(inArray(orderItemModifiers.orderItemId, itemIds));

    const modifiersByItem = new Map<string, string[]>();
    for (const row of modifierRows) {
      const list = modifiersByItem.get(row.orderItemId) ?? [];
      list.push(row.value);
      modifiersByItem.set(row.orderItemId, list);
    }

    return {
      order,
      items: items.map((item) => ({ ...item, modifiers: modifiersByItem.get(item.id) ?? [] })),
    };
  });

  if (!data) notFound();

  return <OrderDetailView order={data.order} items={data.items} />;
}
