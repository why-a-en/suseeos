"use client";

import { useState, useTransition } from "react";
import { Screen, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { Badge, type OrderItemStatus } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cancelOrderItemAction } from "../actions";

const CANCELLABLE_STATUSES = ["pending", "purchased", "received", "packed"] as const;

function display(status: string): OrderItemStatus {
  return (status.charAt(0).toUpperCase() + status.slice(1)) as OrderItemStatus;
}

type OrderDetail = {
  id: string;
  notes: string | null;
  createdAt: Date;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
};

type OrderItemRow = {
  id: string;
  productName: string;
  quantity: number;
  status: string;
  modifiers: string[];
};

export function OrderDetailView({ order, items }: { order: OrderDetail; items: OrderItemRow[] }) {
  const [isPending, startTransition] = useTransition();
  // The item pending confirmation, or null — a single piece of state rather
  // than one boolean per row, since only one row's dialog can be open at once.
  const [confirming, setConfirming] = useState<OrderItemRow | null>(null);

  function confirmCancel() {
    if (!confirming) return;
    const itemId = confirming.id;
    startTransition(async () => {
      await cancelOrderItemAction(itemId, order.id);
      setConfirming(null);
    });
  }

  return (
    <Screen>
      {/* No "add item" action: an Order is closed to new Items once placed
          (see the note above cancelOrderItemAction in ../actions.ts). What
          can still change here is cancelling an Item that can't be
          fulfilled. */}
      <TopBar title={order.customerName} eyebrow={order.customerPhone} backHref="/orders" />
      <ScrollBody>
        <div className="grid gap-4 px-5 py-4">
          {order.customerAddress && <p className="font-ui text-small text-text-muted">{order.customerAddress}</p>}
          {order.notes && <p className="font-ui text-small text-text-body">{order.notes}</p>}

          <section className="grid gap-2">
            <span className="font-mono text-label tracking-label uppercase text-text-faint">Items</span>

            {/* Reachable only for an order whose items were all cancelled —
                items can't be added back here, so the copy doesn't invite
                it. */}
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
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge status={display(item.status)} size="sm" />
                    {(CANCELLABLE_STATUSES as readonly string[]).includes(item.status) && (
                      <button
                        type="button"
                        onClick={() => setConfirming(item)}
                        className="cursor-pointer border-none bg-transparent font-ui text-small text-danger underline underline-offset-2 outline-none transition-transform duration-instant ease-standard active:scale-95 focus-visible:shadow-[var(--focus-ring)]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </ScrollBody>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this item?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogBody>
            <AlertDialogDescription>
              {confirming ? `${confirming.productName} (qty ${confirming.quantity})` : ""} drops out of the Purchase
              and Packing Queues. The record stays on this order, marked Cancelled — this can&rsquo;t be undone.
            </AlertDialogDescription>
          </AlertDialogBody>
          <AlertDialogFooter className="grid gap-2">
            <Button full variant="danger" disabled={isPending} onClick={confirmCancel}>
              Cancel item
            </Button>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
