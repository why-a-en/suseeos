import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { withCurrentOrganization } from "@/lib/tenancy";
import { listStaff } from "@/services/staff";
import { StaffMemberView } from "./staff-member-view";

// Admin-only, same as the list — requireAdmin() redirects anyone else who
// reaches this URL directly.
export default async function StaffMemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  const user = await requireAdmin();
  const { memberId } = await params;

  const staff = await withCurrentOrganization((ctx) => listStaff(ctx));
  const member = staff.find((m) => m.memberId === memberId);
  if (!member) notFound();

  // Your own row isn't tappable in the list, and the destructive actions
  // here all refuse self anyway (services/staff) — so this URL is a dead
  // end for yourself rather than a page of disabled buttons.
  if (member.userId === user.id) redirect("/admin/staff");

  return (
    <StaffMemberView
      member={{
        memberId: member.memberId,
        name: member.name,
        email: member.email,
        role: member.role,
        status: member.status,
        // Formatted here, not in the client component: toLocaleDateString
        // reads the runtime's locale and timezone, and formatting a date the
        // server already rendered is a textbook hydration mismatch (same
        // reasoning as orders/query.ts).
        joinedLabel: member.joinedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      }}
    />
  );
}
