import { requirePlatformUser } from "@/lib/auth";
import { listUsers } from "@/services/platform";
import { UsersView } from "./users-view";

export default async function UsersPage() {
  const operator = await requirePlatformUser();
  const users = await listUsers();

  return <UsersView users={users} currentUserId={operator.id} />;
}
