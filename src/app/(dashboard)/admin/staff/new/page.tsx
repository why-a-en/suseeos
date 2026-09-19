import { requireAdmin } from "@/lib/auth";
import { Screen } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { AddStaffForm } from "./add-staff-form";

// Admin-only, same as the list it hangs off — requireAdmin() redirects
// anyone else who reaches this URL directly. The route is guarded, not just
// unlinked.
export default async function AddStaffPage() {
  await requireAdmin();

  return (
    <Screen>
      <TopBar title="Add staff" eyebrow="Staff" backHref="/admin/staff" />
      <AddStaffForm />
    </Screen>
  );
}
