import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { withCurrentOrganization } from "@/lib/tenancy";
import { isUuid } from "@/lib/uuid";
import { cn } from "@/lib/utils";
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

/** A line's extended price, formatted, or "—" when the product has no set
 *  price. No currency suffix — the total below carries it once. Mirrors
 *  new-order-wizard.tsx's lineAmount/formatPrice. */
function lineAmount(productPrice: string | null, quantity: number): string {
  return productPrice == null ? "—" : (Number(productPrice) * quantity).toLocaleString();
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
        price: products.price,
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

  // Same accounting as the wizard's docket (new-order-wizard.tsx): a null
  // price can't be assumed to be 0, so it's tracked separately rather than
  // silently under-totaling. Cancelled items are left out — they're not
  // being fulfilled, so they're not part of what the Customer owes.
  let priceTotal = 0;
  let hasUnpricedItem = false;
  for (const item of items) {
    if (item.status === "cancelled") continue;
    if (item.price == null) hasUnpricedItem = true;
    else priceTotal += Number(item.price) * item.quantity;
  }
  const showAmounts = priceTotal > 0;
  const totalText = `${priceTotal.toLocaleString()} MMK${hasUnpricedItem ? "+" : ""}`;

  return (
    <Screen>
      {/* Read-only — no "add item" (an Order is closed to new Items once
          placed, see saveOrder's own comment) and no cancel action either:
          this page is the record of what happened, not where you act on an
          item's lifecycle. That happens from the Purchase Queue ("Can't
          source") or Parcels (its own Cancel), where the person actually
          working that stage is looking at it. */}
      {/* Order number as the eyebrow, customer name as the title — the
          TopBar's normal two-line shape, not one line carrying both. The
          phone number used to sit in the eyebrow instead, but that's
          contact info, not identity; it's a labeled row below now, next to
          the address. */}
      <TopBar eyebrow={`#${order.orderNumber}`} title={order.customerName} backHref="/orders" />
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

          {/* Same labeled-row shape as Parcels' item sheet (parcels-view.tsx)
              — a mono micro-label left, the value right-aligned. */}
          <div className="grid gap-2">
            <div className="flex justify-between gap-3 border-b border-line-hairline pb-2">
              <span className="font-mono text-label tracking-label uppercase text-text-faint">Phone</span>
              <span className="text-right font-ui text-small text-text-body">{order.customerPhone}</span>
            </div>
            {order.customerAddress && (
              <div className="flex justify-between gap-3 border-b border-line-hairline pb-2">
                <span className="font-mono text-label tracking-label uppercase text-text-faint">Address</span>
                <span className="text-right font-ui text-small text-text-body">{order.customerAddress}</span>
              </div>
            )}
          </div>
          {order.notes && <p className="font-ui text-small text-text-body">{order.notes}</p>}

          <section className="grid gap-2">
            <span className="font-mono text-label tracking-label uppercase text-text-faint">Items</span>

            {/* Reachable only for an order whose items were all cancelled
                elsewhere (Purchase Queue / Parcels) — nothing on this page
                does that, so the copy doesn't invite it. */}
            {items.length === 0 ? (
              <EmptyState icon="package" title="Nothing on this order." body="Every item on it was cancelled." />
            ) : (
              <>
                {items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-line-hairline p-3">
                    <div>
                      <p className="font-ui text-body-strong text-text-strong">{item.productName}</p>
                      <p className="mt-0.5 font-ui text-small text-text-muted">
                        {item.modifiers.length > 0 ? `${item.modifiers.join(", ")} · ` : ""}
                        qty {item.quantity}
                        {showAmounts && item.status !== "cancelled" ? ` · ${lineAmount(item.price, item.quantity)}` : ""}
                      </p>
                    </div>
                    <Badge status={display(item.status)} size="sm" />
                  </div>
                ))}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="font-mono text-label tracking-label uppercase text-text-faint">Total</span>
                  <span
                    className={cn(
                      "font-ui text-body-strong [font-variant-numeric:tabular-nums]",
                      showAmounts ? "text-text-strong" : "text-text-faint",
                    )}
                  >
                    {showAmounts ? totalText : "Not priced yet"}
                  </span>
                </div>
              </>
            )}
          </section>
        </div>
      </ScrollBody>
    </Screen>
  );
}
