import { ScreenLoading, LoadingSearchToolbar, LoadingRows } from "@/components/ui/screen-loading";

// Matches orders-view.tsx: search toolbar, then rows with no leading avatar
// (the Orders log reads out #number + customer name, no thumbnail).
export default function Loading() {
  return (
    <ScreenLoading title="Orders" brand>
      <LoadingSearchToolbar />
      <LoadingRows avatar="none" />
    </ScreenLoading>
  );
}
