"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Screen, ScrollBody, Toolbar } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { IconButton } from "@/components/ui/icon-button";
import { Row } from "@/components/ui/row";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Icon } from "@/components/icon";
import type { StaffMember } from "@/services/staff";
import type { AppRole } from "@/services/types";
import { cancelInviteAction, resendInviteAction } from "./actions";

/** A pending invitation with its expiry already formatted. The date is
 *  rendered on the server (see page.tsx): `toLocaleDateString` reads the
 *  runtime's own locale and timezone, so formatting a server-rendered date
 *  down here is a hydration mismatch — the same reason orders/query.ts
 *  formats its dates before they reach the client. */
export interface InviteRowData {
  id: string;
  email: string;
  role: AppRole;
  expiresLabel: string;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  support_agent: "Support Agent",
  supplier: "Supplier",
};

// Three states, not two lists. "Team" and "Pending" used to be hardcoded
// sections stacked on each other, which meant a suspended member sat
// silently among the active ones and the only way to see invitations was to
// scroll past everybody. A filter says what you're looking at, and there's
// no fourth "All" on purpose: the three are mutually exclusive, and four
// segments at 390px squeezes "Suspended" to the point of truncation.
type Filter = "active" | "suspended" | "invited";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "invited", label: "Invited" },
];

export function StaffView({
  staff,
  currentUserId,
  pendingInvitations,
}: {
  staff: StaffMember[];
  currentUserId: string;
  pendingInvitations: InviteRowData[];
}) {
  const [filter, setFilter] = useState<Filter>("active");

  const members = staff.filter((m) => m.status === filter);
  const showingInvites = filter === "invited";
  const count = showingInvites ? pendingInvitations.length : members.length;

  return (
    <Screen>
      {/* Reached from Home, not a tab — so it leads with a back arrow.
          See CLAUDE.md's "every nested screen has a back button". */}
      <TopBar
        backHref="/home"
        title="Staff"
        eyebrow={`${count} ${showingInvites ? "invited" : filter}`}
        right={<IconButton icon="user-plus" label="Add staff" variant="solid" href="/admin/staff/new" />}
      />
      <Toolbar>
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      </Toolbar>
      <ScrollBody>
        {showingInvites ? (
          pendingInvitations.length === 0 ? (
            <EmptyState icon="inbox" title="Nobody's waiting." body="Invitations you send will sit here until they're accepted." />
          ) : (
            pendingInvitations.map((invite) => <InviteRow key={invite.id} invite={invite} />)
          )
        ) : members.length === 0 ? (
          <EmptyState
            icon="users"
            title={filter === "suspended" ? "Nobody's suspended." : "No active staff."}
            body={
              filter === "suspended"
                ? "Suspended teammates keep their account but can't sign in."
                : "Invite a teammate with the + above."
            }
          />
        ) : (
          members.map((member) => {
            const isSelf = member.userId === currentUserId;
            return (
              // Your own row goes nowhere: every action on the member page
              // refuses self anyway (services/staff).
              <Row key={member.memberId} href={isSelf ? undefined : `/admin/staff/${member.memberId}`}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">
                    {member.name}
                    {isSelf && <span className="text-text-faint"> (you)</span>}
                  </span>
                  <span className="truncate font-ui text-small text-text-faint">{member.email}</span>
                </span>
                <span className="shrink-0 font-ui text-small text-text-faint">{ROLE_LABELS[member.role]}</span>
                {!isSelf && <Icon name="chevron-right" size={16} className="shrink-0 text-text-faint" />}
              </Row>
            );
          })
        )}
      </ScrollBody>
    </Screen>
  );
}

/** An invitation isn't a person yet — there's no member page to open, and
 *  the only two things you can do to it are resend and cancel. So they sit
 *  on the row itself rather than behind a tap, on their own line because
 *  two buttons plus an email address don't fit across 390px. */
function InviteRow({ invite }: { invite: InviteRowData }) {
  const [pending, startTransition] = useTransition();

  function resend() {
    startTransition(async () => {
      const result = await resendInviteAction(invite.email, invite.role);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invitation resent to ${invite.email}.`);
    });
  }

  function cancel() {
    startTransition(async () => {
      const result = await cancelInviteAction(invite.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invitation to ${invite.email} cancelled.`);
    });
  }

  return (
    <div className="border-b border-line-hairline px-5 py-3">
      <div className="flex items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{invite.email}</span>
          <span className="truncate font-ui text-small text-text-faint">
            Invited as {ROLE_LABELS[invite.role]} · expires {invite.expiresLabel}
          </span>
        </span>
        <Badge tone="quiet">Invited</Badge>
      </div>
      <div className="mt-2.5 flex gap-2">
        <Button variant="secondary" size="sm" disabled={pending} onClick={resend}>
          Resend
        </Button>
        <Button variant="danger" size="sm" disabled={pending} onClick={cancel}>
          Cancel invite
        </Button>
      </div>
    </div>
  );
}
