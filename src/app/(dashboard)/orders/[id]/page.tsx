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
  users,
} from "@/db/schema";
import { Screen, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { Badge, type OrderItemStatus } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

function display(status: string): OrderItemStatus {
  return (status.charAt(0).toUpperCase() + status.slice(1)) as OrderItemStatus;
}

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
        orderNumber: orders.orderNumber,
        notes: orders.notes,
        createdAt: orders.createdAt,
        placedAt: orders.placedAt,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        creatorName: users.name,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .innerJoin(users, eq(users.id, orders.createdBy))
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
  const { order, items } = data;

  return (
    <Screen>
      {/* Read-only — no "add item" (an Order is closed to new Items once
          placed, see saveOrder's own comment) and no cancel action either:
          this page is the record of what happened, not where you act on an
          item's lifecycle. That happens from the Purchase Queue ("Can't
          source") or Parcels (its own Cancel), where the person actually
          working that stage is looking at it. */}
      {/* Order number + customer name, nothing else — the phone number used
          to sit here as the eyebrow, but that's contact info, not identity;
          it reads better next to the address below than above the name. */}
      <TopBar title={`#${order.orderNumber} ${order.customerName}`} backHref="/orders" />
      <ScrollBody>
        <div className="grid gap-4 px-5 py-4">
          <div className="flex items-center gap-2">
            {/* Order-level state — the only one there is (ADR-0001): whether
                it's been placed yet. Separate from each Item's own status
                badge below, which is what a freshly-placed order's items
                start as ("Pending") regardless of this. */}
            <Badge tone={order.placedAt ? "accent" : "quiet"}>{order.placedAt ? "Placed" : "Draft"}</Badge>
            <span className="font-ui text-small text-text-faint">by {order.creatorName}</span>
          </div>
          <p className="font-ui text-small text-text-muted">
            {order.customerPhone}
            {order.customerAddress ? ` · ${order.customerAddress}` : ""}
          </p>
          {order.notes && <p className="font-ui text-small text-text-body">{order.notes}</p>}

          <section className="grid gap-2">
            <span className="font-mono text-label tracking-label uppercase text-text-faint">Items</span>

            {/* Reachable only for an order whose items were all cancelled
                elsewhere (Purchase Queue / Parcels) — nothing on this page
                does that, so the copy doesn't invite it. */}
            {items.length === 0 ? (
              <EmptyState icon="package" title="Nothing on this order." body="Every item on it was cancelled." />
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-line-hairline p-3">
                  <div>
                    <p className="font-ui text-body-strong text-text-strong">{item.productName}</p>
                    <p className="mt-0.5 font-ui text-small text-text-muted">
                      {item.modifiers.length > 0 ? `${item.modifiers.join(", ")} · ` : ""}
                      qty {item.quantity}
                    </p>
                  </div>
                  <Badge status={display(item.status)} size="sm" />
                </div>
              ))
            )}
          </section>
        </div>
      </ScrollBody>
    </Screen>
  );
}
