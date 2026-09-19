"use client";

import { useQueryState } from "nuqs";
import { Screen, Toolbar, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { OrderItemRow } from "@/components/ui/order-item-row";
import { SectionHeader } from "@/components/ui/section-header";
import { type OrderItemStatus } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export type ParcelStage = "purchased" | "received" | "packed";

export interface ParcelItem {
  id: string;
  orderId: string;
  quantity: number;
  status: ParcelStage;
  productName: string;
  customerName: string;
  selection: string[];
}

const SEGMENTS: { value: ParcelStage | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "purchased", label: "Purchased" },
  { value: "received", label: "Received" },
  { value: "packed", label: "Packed" },
];

const HEADING: Record<ParcelStage | "all", string> = {
  all: "All stages",
  purchased: "Out for purchase",
  received: "Arrived, to pack",
  packed: "Packed, to send",
};

function display(status: ParcelStage): OrderItemStatus {
  return (status.charAt(0).toUpperCase() + status.slice(1)) as OrderItemStatus;
}

/** The parcel queue. Tapping a row opens /parcels/<id> rather than a Sheet
 *  over the list — an order row opens a page, so a parcel row does too, and
 *  the advance/cancel actions live there with it. */
export function ParcelsView({ items, status: initialStatus }: { items: ParcelItem[]; status: ParcelStage | "all" }) {
  // shallow: false — a segment change needs the Server Component to re-query
  // with the new status filter, not just update the URL client-side.
  const [status, setStatus] = useQueryState<ParcelStage | "all">("status", {
    defaultValue: "all",
    parse: (v): ParcelStage | "all" => (["purchased", "received", "packed"].includes(v) ? (v as ParcelStage) : "all"),
    serialize: (v) => (v === "all" ? "" : v),
    shallow: false,
  });
  const active = status ?? initialStatus;

  return (
    <Screen>
      <TopBar backHref="/home" title="Parcels" eyebrow="customer service" />
      <Toolbar>
        <SegmentedControl options={SEGMENTS} value={active} onChange={(v) => setStatus(v === "all" ? null : v)} />
      </Toolbar>
      <ScrollBody>
        <SectionHeader right={`${items.length} items`}>{HEADING[active]}</SectionHeader>
        {items.length ? (
          items.map((item) => (
            <OrderItemRow
              key={item.id}
              product={item.productName}
              selection={item.selection}
              qty={item.quantity}
              status={display(item.status)}
              customer={item.customerName}
              href={`/parcels/${item.id}`}
            />
          ))
        ) : (
          <EmptyState
            icon="box"
            title="Nothing here."
            body={active === "received" ? "Nothing has arrived waiting to be packed." : "No items in this stage."}
          />
        )}
      </ScrollBody>
    </Screen>
  );
}
