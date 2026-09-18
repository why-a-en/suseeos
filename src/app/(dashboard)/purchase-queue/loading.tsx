import { ScreenLoading, LoadingStatTiles, LoadingSearchToolbar, LoadingCards } from "@/components/ui/screen-loading";

// Matches purchase-queue-view.tsx: 2 stat tiles, a search toolbar, then
// PurchaseGroupCard's own bordered cards — not flat rows.
export default function Loading() {
  return (
    <ScreenLoading title="To purchase" brand>
      <LoadingStatTiles count={2} gap="gap-2" />
      <LoadingSearchToolbar />
      <LoadingCards />
    </ScreenLoading>
  );
}
