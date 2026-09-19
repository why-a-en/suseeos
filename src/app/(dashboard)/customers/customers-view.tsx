"use client";

import { useState } from "react";
import { Screen, ScrollBody, Toolbar } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { IconButton } from "@/components/ui/icon-button";
import { SearchField } from "@/components/ui/search-field";
import { CustomerRow } from "@/components/ui/customer-row";
import { EmptyState } from "@/components/ui/empty-state";

export interface CustomerRowData {
  id: string;
  name: string;
  phone: string;
  address: string | null;
}

/** The Customers list. Creating one is its own screen (/customers/new)
 *  rather than a Sheet over this list: every other "add" in the app lands
 *  on a page, so this one does too. */
export function CustomersView({ customers }: { customers: CustomerRowData[] }) {
  const [q, setQ] = useState("");

  const query = q.toLowerCase();
  const filtered = customers.filter((c) => (c.name + c.phone).toLowerCase().includes(query));

  return (
    <Screen>
      <TopBar
        backHref="/home"
        title="Customers"
        eyebrow={`${customers.length} customer${customers.length === 1 ? "" : "s"}`}
        right={<IconButton icon="user-plus" label="Add customer" variant="solid" href="/customers/new" />}
      />
      <Toolbar>
        <SearchField value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ("")} placeholder="Name or phone" />
      </Toolbar>
      <ScrollBody>
        {filtered.length === 0 ? (
          <EmptyState
            icon="users"
            title={q ? "No match." : "No customers yet."}
            body={q ? "Nobody by that name or number." : "Add the first one to get started."}
          />
        ) : (
          filtered.map((c) => <CustomerRow key={c.id} name={c.name} phone={c.phone} address={c.address} />)
        )}
      </ScrollBody>
    </Screen>
  );
}
