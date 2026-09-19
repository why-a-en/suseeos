"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Screen, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { SettingRow } from "@/components/ui/setting-row";
import { Button } from "@/components/ui/button";
import { Badge, type OrderItemStatus } from "@/components/ui/badge";
import { ErrorDialog } from "@/components/ui/error-dialog";
import { markReceivedAction, markPackedAction, markCompletedAction } from "../actions";
import { cancelOrderItemAction } from "../../orders/actions";
import type { ParcelStage } from "../parcels-view";

export interface ParcelItemDetail {
  id: string;
  orderId: string;
  orderNumber: string;
  quantity: number;
  status: ParcelStage;
  productName: string;
  customerName: string;
  selection: string[];
  /** Preformatted on the server — formatting a server-rendered date in a
   *  client component is a hydration mismatch (see orders/query.ts). */
  updatedLabel: string;
}

const NEXT: Record<ParcelStage, { status: OrderItemStatus; action: (id: string) => Promise<void>; verb: string }> = {
  purchased: { status: "Received", action: markReceivedAction, verb: "Mark received" },
  received: { status: "Packed", action: markPackedAction, verb: "Mark packed" },
  packed: { status: "Completed", action: markCompletedAction, verb: "Mark completed" },
};

function display(status: ParcelStage): OrderItemStatus {
  return (status.charAt(0).toUpperCase() + status.slice(1)) as OrderItemStatus;
}

/**
 * One parcel item — was a Sheet over the Parcels list.
 *
 * A page for the same reason an order row opens one: tapping a record
 * should always land on the same kind of surface, whichever list you
 * tapped it from. Both actions here move the item out of the stage you
 * were looking at, so they route back to the list rather than leaving you
 * on a detail page describing a state that no longer applies.
 */
export function ParcelItemView({ item }: { item: ParcelItemDetail }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const next = NEXT[item.status];

  function advance() {
    startTransition(async () => {
      try {
        await next.action(item.id);
        toast.success(`${item.productName} → ${next.status}`);
        router.push("/parcels");
      } catch (e) {
        setError(e instanceof Error ? e.message : `Couldn't move ${item.productName} to ${next.status}.`);
      }
    });
  }

  // cancelOrderItemAction already exists (orders/actions.ts, used from the
  // order detail page) and already revalidates both queues — this is a
  // second entry point, not new cancel logic.
  function cancel() {
    startTransition(async () => {
      try {
        await cancelOrderItemAction(item.id, item.orderId);
        toast.success(`${item.productName} cancelled`);
        router.push("/parcels");
      } catch (e) {
        setError(e instanceof Error ? e.message : `Couldn't cancel ${item.productName}.`);
      }
    });
  }

  return (
    <Screen>
      <TopBar title={item.productName} eyebrow="Parcel" backHref="/parcels" />
      <ScrollBody>
        <div className="px-5 pt-3 pb-1">
          <Badge status={display(item.status)} size="md" />
        </div>

        <SectionHeader>Item</SectionHeader>
        <SettingRow label="Customer">
          <span className="truncate font-ui text-body-strong text-text-strong">{item.customerName}</span>
        </SettingRow>
        <SettingRow label="Order">
          <span className="font-mono text-code text-text-strong">{item.orderNumber}</span>
        </SettingRow>
        <SettingRow label="Selection">
          <span className="truncate font-ui text-body-strong text-text-strong">
            {item.selection.length ? item.selection.join(" / ") : "—"}
          </span>
        </SettingRow>
        <SettingRow label="Quantity">
          <span className="font-ui text-body-strong text-text-strong [font-variant-numeric:tabular-nums]">×{item.quantity}</span>
        </SettingRow>
        <SettingRow label="Updated">
          <span className="font-ui text-body-strong text-text-strong">{item.updatedLabel}</span>
        </SettingRow>

        <div className="grid gap-2 px-5 pt-5 pb-8">
          <Button full icon="check" disabled={pending} onClick={advance}>
            {pending ? "Working…" : next.verb}
          </Button>
          <Button full variant="danger" icon="x" disabled={pending} onClick={cancel}>
            Cancel item
          </Button>
        </div>
      </ScrollBody>

      <ErrorDialog open={!!error} message={error} onOk={() => setError(null)} />
    </Screen>
  );
}
