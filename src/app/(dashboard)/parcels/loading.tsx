import { ScreenLoading, LoadingSegmentedToolbar, LoadingRows } from "@/components/ui/screen-loading";

// Matches parcels-view.tsx: a 4-segment SegmentedControl toolbar, then rows
// with OrderItemRow's own square Thumb.
export default function Loading() {
  return (
    <ScreenLoading title="Parcels" backHref="/home">
      <LoadingSegmentedToolbar segments={4} />
      <LoadingRows avatar="square" />
    </ScreenLoading>
  );
}
