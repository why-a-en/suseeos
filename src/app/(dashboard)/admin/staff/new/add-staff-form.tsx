"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScrollBody } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEmailCheck } from "@/lib/use-email-check";
import type { AppRole } from "@/services/types";
import { RoleChoice } from "../role-choice";
import { addStaffAction, checkStaffEmailAction } from "../actions";

/** Invite a teammate. Was a Sheet over the Staff list; a page now, like
 *  every other "add" in the app.
 *
 *  The sheet used to end on a confirmation panel ("we've sent an invitation
 *  to…") because it had nowhere else to go. A page doesn't need one: the
 *  invitation lands in the list's own Invited filter, which is a more
 *  durable confirmation than a screen you dismiss, so this routes back
 *  there with a toast instead. */
export function AddStaffForm() {
  const router = useRouter();
  const [role, setRole] = useState<AppRole>("support_agent");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const emailCheck = useEmailCheck(checkStaffEmailAction);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addStaffAction(undefined, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(`Invitation sent to ${result.invitedEmail}.`);
      router.push("/admin/staff");
    });
  }

  return (
    <ScrollBody>
      <form action={handleSubmit}>
        <div className="grid gap-4 px-5 pt-4">
          <Field
            label="Email"
            required
            hint={emailCheck.status === "checking" ? "Checking…" : undefined}
            error={emailCheck.status === "invalid" ? emailCheck.error : undefined}
          >
            <Input
              name="email"
              type="email"
              autoComplete="off"
              icon="at-sign"
              placeholder="name@example.com"
              value={emailCheck.value}
              onChange={(e) => emailCheck.setValue(e.target.value)}
              invalid={emailCheck.status === "invalid"}
              className={cn(emailCheck.status === "checking" && "ds-working")}
            />
          </Field>
        </div>

        <SectionHeader>Role</SectionHeader>
        <RoleChoice value={role} onChange={setRole} disabled={pending} />
        <input type="hidden" name="role" value={role} />

        <div className="grid gap-2 px-5 pt-5 pb-8">
          {error && <p className="font-ui text-small text-danger">{error}</p>}
          {/* Can't submit an address that hasn't cleared the live check. */}
          <Button full type="submit" icon="user-plus" disabled={pending || emailCheck.status !== "valid"}>
            {pending ? "Sending…" : "Send invitation"}
          </Button>
          <p className="font-ui text-small text-text-faint">
            They&rsquo;ll set their own name and password when they accept — no password is issued here.
          </p>
        </div>
      </form>
    </ScrollBody>
  );
}
