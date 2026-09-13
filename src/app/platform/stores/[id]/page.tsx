import { notFound } from "next/navigation";
import { requirePlatformUser } from "@/lib/auth";
import { isUuid } from "@/lib/uuid";
import { getStoreDetail } from "@/services/platform";
import { StoreDetailView } from "./store-detail-view";

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformUser();

  const { id } = await params;
  if (!isUuid(id)) notFound();

  const store = await getStoreDetail(id);
  if (!store) notFound();

  return <StoreDetailView store={store} />;
}
