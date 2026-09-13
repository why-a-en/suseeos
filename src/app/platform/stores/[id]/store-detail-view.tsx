"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Screen, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { Row } from "@/components/ui/row";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Icon } from "@/components/icon";
import type { StoreDetail } from "@/services/platform";
import { impersonateAction } from "../../actions";
import {
  cancelStoreInvitationAction,
  resendStoreInvitationAction,
  setStoreStatusAction,
} from "../actions";

const ROLE_LABELS = {
  admin: "Admin",
  support_agent: "Support Agent",
  supplier: "Supplier",
} as const;

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Member = StoreDetail["members"][number];
type PendingInvitation = StoreDetail["pendingInvitations"][number];

export function StoreDetailView({ store }: { store: StoreDetail }) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Member | null>(null);
  const [selectedInvite, setSelectedInvite] = useState<PendingInvitation | null>(null);

  return (
    <Screen>
      <TopBar backHref="/platform/stores" title={store.name} eyebrow="Operator" />
      <ScrollBody>
        <div className="grid gap-3 px-5 py-4">
          <p className="font-ui text-small text-text-faint">
            <code className="font-mono text-code">{store.slug}</code> · created{" "}
            {formatDate(store.createdAt)}
            {store.status === "suspended" && (
              <span className="text-danger"> · suspended</span>
            )}
          </p>

          {/* Suspension is the only lever over a client account (ADR-0002
              §8) — a suspended Store resolves to no session for every
              one of its members on their next request. */}
          <Button
            full
            variant={store.status === "suspended" ? "secondary" : "danger"}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setStoreStatusAction(
                  store.id,
                  store.status === "suspended" ? "active" : "suspended",
                );
                if (result.error) toast.error(result.error);
              })
            }
          >
            {store.status === "suspended" ? "Restore Store" : "Suspend Store"}
          </Button>
        </div>

        <SectionHeader right={`${store.members.length}`}>Members</SectionHeader>
        {store.members.map((member) => (
          <Row key={member.userId} onClick={() => setSelected(member)}>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{member.name}</span>
              <span className="truncate font-ui text-small text-text-faint">{member.email}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {member.status === "suspended" && (
                <span className="font-ui text-small text-danger">Suspended</span>
              )}
              <span className="font-ui text-small text-text-faint">
                {ROLE_LABELS[member.role]}
              </span>
              <Icon name="chevron-right" size={16} className="text-text-faint" />
            </div>
          </Row>
        ))}

        {/* Hidden entirely once nobody's waiting — almost always just the
            first Admin's, until it's accepted. */}
        {store.pendingInvitations.length > 0 && (
          <>
            <SectionHeader right={`${store.pendingInvitations.length}`}>Pending</SectionHeader>
            {store.pendingInvitations.map((invite) => (
              <Row key={invite.id} onClick={() => setSelectedInvite(invite)}>
                <span className="min-w-0 flex-1 truncate">{invite.email}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-ui text-small text-text-faint">{ROLE_LABELS[invite.role]}</span>
                  <Icon name="chevron-right" size={16} className="text-text-faint" />
                </div>
              </Row>
            ))}
          </>
        )}
      </ScrollBody>

      <MemberSheet
        member={selected}
        storeSuspended={store.status === "suspended"}
        onClose={() => setSelected(null)}
      />
      <InviteSheet
        storeId={store.id}
        invite={selectedInvite}
        onClose={() => setSelectedInvite(null)}
      />
    </Screen>
  );
}

function MemberSheet({
  member,
  storeSuspended,
  onClose,
}: {
  member: Member | null;
  storeSuspended: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Sheet open={member !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {member && (
          <>
            <SheetHeader title={member.name} />
            <SheetBody className="grid gap-3">
              <p className="font-ui text-small text-text-faint">{member.email}</p>
              <p className="font-ui text-small text-text-body">
                {ROLE_LABELS[member.role]}
                {member.status === "suspended" && " · membership suspended"} · joined{" "}
                {formatDate(member.joinedAt)}
              </p>
            </SheetBody>
            <SheetFooter>
              {/* Can't impersonate into a suspended Store — its members
                  resolve to no session, so the impersonated view would just
                  be the login screen. Restore it first. */}
              <Button
                full
                variant="secondary"
                icon="user"
                disabled={pending || storeSuspended}
                onClick={() =>
                  startTransition(async () => {
                    const result = await impersonateAction(member.email);
                    if (result?.error) toast.error(result.error);
                  })
                }
              >
                {storeSuspended ? "Can't impersonate — Store suspended" : "Impersonate"}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InviteSheet({
  storeId,
  invite,
  onClose,
}: {
  storeId: string;
  invite: PendingInvitation | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function resend() {
    if (!invite) return;
    startTransition(async () => {
      const result = await resendStoreInvitationAction(storeId, invite.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invitation resent to ${invite.email}.`);
      onClose();
    });
  }

  function cancel() {
    if (!invite) return;
    startTransition(async () => {
      const result = await cancelStoreInvitationAction(storeId, invite.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Sheet open={invite !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {invite && (
          <>
            <SheetHeader title={invite.email} eyebrow={`Invited as ${ROLE_LABELS[invite.role]}`} />
            <SheetBody className="grid gap-5">
              <p className="font-ui text-small text-text-faint">
                Expires{" "}
                {invite.expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.
                Not yet accepted — nothing about this person exists beyond this invitation.
              </p>
              <div className="grid gap-3">
                <Button full variant="secondary" disabled={pending} onClick={resend}>
                  Resend
                </Button>
                <Button full variant="danger" disabled={pending} onClick={cancel}>
                  Cancel invitation
                </Button>
              </div>
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
