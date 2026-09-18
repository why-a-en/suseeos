import { ScreenLoading, LoadingSearchToolbar, LoadingRows } from "@/components/ui/screen-loading";

// Matches products-view.tsx: search toolbar, then rows with ProductRow's own
// square Thumb.
export default function Loading() {
  return (
    <ScreenLoading title="Products" backHref="/home">
      <LoadingSearchToolbar />
      <LoadingRows avatar="square" />
    </ScreenLoading>
  );
}
