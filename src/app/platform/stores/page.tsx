import { requirePlatformUser } from "@/lib/auth";
import { listStores } from "@/services/platform";
import { StoresView } from "./stores-view";

export default async function StoresPage() {
  await requirePlatformUser();
  const stores = await listStores();

  return <StoresView stores={stores} />;
}
