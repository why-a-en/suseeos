"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Screen, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { SettingRow } from "@/components/ui/setting-row";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/services/types";
import { RoleChoice } from "../role-choice";
import {
  changeStaffRoleAction,
  removeStaffAction,
  resetStaffPasswordAction,
  setStaffStatusAction,
} from "../actions";

export interface StaffMemberDetail {
  memberId: string;
  name: string;
  email: string;
  role: AppRole;
  status: "active" | "suspended";
  /** Preformatted on the server — see the page, and query.ts's note on why
   *  dates aren't formatted in client components here. */
  joinedLabel: string;
}

/**
 * One staff member, as a page — was a Sheet stacked over the list.
 *
 * The role picker commits explicitly. It used to fire changeStaffRoleAction
 * on the segmented control's onChange, so a single mis-tap silently moved
 * someone between Supplier and Admin with no confirmation and no undo —
 * the one control on the screen that mutated on touch while every other
 * action here is a button you press on purpose. Now the tap only moves the
 * selection, and a button naming the outcome appears until it's committed
 * or reverted.
 */
export function StaffMemberView({ member }: { member: StaffMemberDetail }) {
  const router = useRouter();
  const [role, setRole] = useState<AppRole>(member.role);
  const [pending, startTransition] = useTransition();

  const roleChanged = role !== member.role;
  const suspended = member.status === "suspended";

  function run(action: () => Promise<{ error?: string }>, success: string, thenLeave = false) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      if (thenLeave) router.push("/admin/staff");
      else router.refresh();
    });
  }

  function commitRole() {
    const label = ROLE_LABEL[role];
    run(() => changeStaffRoleAction(member.memberId, role), `${member.name} is now ${label}.`);
  }

  function resetPassword() {
    startTransition(async () => {
      const result = await resetStaffPasswordAction(member.memberId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sign-in details emailed to ${result.emailedTo}.`);
    });
  }

  return (
    <Screen>
      <TopBar title={member.name} eyebrow="Staff" backHref="/admin/staff" />
      <ScrollBody>
        <SectionHeader>Account</SectionHeader>
        <SettingRow label="Email">
          <span className="truncate font-ui text-body-strong text-text-strong">{member.email}</span>
        </SettingRow>
        <SettingRow label="Joined">
          <span className="font-ui text-body-strong text-text-strong">{member.joinedLabel}</span>
        </SettingRow>
        <SettingRow label="Status">
          <span className={suspended ? "font-ui text-body-strong text-danger" : "font-ui text-body-strong text-text-strong"}>
            {suspended ? "Suspended" : "Active"}
          </span>
        </SettingRow>

        <SectionHeader>Role</SectionHeader>
        <RoleChoice value={role} onChange={setRole} current={member.role} disabled={pending} />
        {roleChanged && (
          <div className="grid gap-2 px-5 pt-3">
            <Button full icon="check" disabled={pending} onClick={commitRole}>
              {pending ? "Saving…" : `Change role to ${ROLE_LABEL[role]}`}
            </Button>
            <p className="font-ui text-small text-text-faint">Nothing changes until you confirm.</p>
          </div>
        )}

        <SectionHeader>Actions</SectionHeader>
        <div className="grid gap-2 px-5 pt-1 pb-8">
          {/* The recovery path, in place of self-service "forgot password" —
              see docs/adr/0003-password-recovery-and-forced-change.md */}
          <Button full variant="secondary" disabled={pending} onClick={resetPassword}>
            Reset password
          </Button>
          <Button
            full
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(
                () => setStaffStatusAction(member.memberId, suspended ? "active" : "suspended"),
                suspended ? `${member.name}'s access restored.` : `${member.name}'s access suspended.`,
              )
            }
          >
            {suspended ? "Restore access" : "Suspend access"}
          </Button>
          {/* Removal drops the membership; their Orders and Products stay
              attributed to them. Suspending is the reversible option, so it
              comes first. */}
          <Button
            full
            variant="danger"
            disabled={pending}
            onClick={() => run(() => removeStaffAction(member.memberId), `${member.name} removed from the Store.`, true)}
          >
            Remove from Store
          </Button>
        </div>
      </ScrollBody>
    </Screen>
  );
}

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  support_agent: "Support Agent",
  supplier: "Supplier",
};
