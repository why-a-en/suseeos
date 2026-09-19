"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScrollBody } from "@/components/ui/screen";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ErrorDialog } from "@/components/ui/error-dialog";
import { createCustomerAction } from "@/app/(dashboard)/orders/actions";

/** The create form that used to be a Sheet over the Customers list.
 *
 *  A page, not an overlay, so that tapping "add" from anywhere in this app
 *  lands on the same kind of surface — the order wizard's own inline create
 *  is a full step for the same reason. Same fields either way; this one
 *  routes back to the list on success rather than closing over it.
 *
 *  No optimistic append to the list behind it (the Sheet used to do that):
 *  createCustomerAction already revalidates /customers, so the row is there
 *  by the time this navigates back. */
export function NewCustomerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        const created = await createCustomerAction({ name, phone, address });
        toast.success(`${created.name} added.`);
        router.push("/customers");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't create that customer.");
      }
    });
  }

  return (
    <>
      <ScrollBody>
        <div className="grid gap-4 px-5 pt-4 pb-8">
          <Field label="Name" required>
            <Input icon="user" autoComplete="name" placeholder="Aung Aung" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone" required>
            <Input
              icon="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="09 987 654 321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="Address" required hint="Needed to ship the parcel once it arrives.">
            <Textarea
              icon="map-pin"
              rows={2}
              autoComplete="street-address"
              placeholder="House, street, township, city"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          <Button full icon="user-plus" disabled={!name || !phone || !address || isPending} onClick={handleCreate}>
            {isPending ? "Creating…" : "Create customer"}
          </Button>
        </div>
      </ScrollBody>

      <ErrorDialog open={!!error} message={error} onOk={() => setError(null)} />
    </>
  );
}
