import { listPendingInvitations, requireAdmin } from "@/lib/auth";
import { withCurrentOrganization } from "@/lib/tenancy";
import { listStaff } from "@/services/staff";
import { StaffView } from "./staff-view";

// Admin-only. requireAdmin() redirects a Support Agent or Supplier who
// reaches this URL directly — the route is guarded, not just unlinked.
export default async function StaffPage() {
  const user = await requireAdmin();
  const [staff, pendingInvitations] = await Promise.all([
    withCurrentOrganization((ctx) => listStaff(ctx)),
    listPendingInvitations(),
  ]);

  return (
    <StaffView
      staff={staff}
      currentUserId={user.id}
      // Expiry formatted here rather than in the row: the invite rows render
      // during SSR now that they're in the list itself (they used to only
      // appear inside a sheet, i.e. client-side), and toLocaleDateString
      // reads the runtime's locale and timezone. See orders/query.ts.
      pendingInvitations={pendingInvitations.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresLabel: invite.expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      }))}
    />
  );
}
